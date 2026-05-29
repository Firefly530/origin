const { prisma } = require("../../db/prisma");
const { AppError } = require("../../core/errors");
const {
  careerTemplateDifficultyBand,
  rollMonthlyCareerIfNeeded,
} = require("../career/careerProgressService");

const PHASE_ORDER = ["intro", "execution", "expert"];
const PHASE_DIFFICULTY_BONUS = { intro: 0, execution: 1, expert: 2 };
const PHASE_REWARD_MULT = { intro: 1, execution: 1.12, expert: 1.28 };

/** 单类任务数量上限（工作量由难度点累计）；不再生成系统选做，缺口由用户自填活动补足 */
const MAX_MAINLINE_TASKS = 14;

function sumTaskDifficulty(rows) {
  return (rows || []).reduce((acc, r) => acc + (Number(r.difficulty) || 1), 0);
}

function getIsoWeekKey(d = new Date()) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((date - yearStart) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

function parseJsonStringArray(raw, fallback = []) {
  if (!raw || typeof raw !== "string") return [...fallback];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.map(String) : [...fallback];
  } catch {
    return [...fallback];
  }
}

function phaseFromCompletions(count) {
  if (count <= 2) return "intro";
  if (count <= 5) return "execution";
  return "expert";
}

function scoreTemplateOverlap(template, focusSet) {
  const tags = parseJsonStringArray(template.defectTagsJson, []);
  return tags.reduce((acc, tag) => acc + (focusSet.has(tag) ? 1 : 0), 0);
}

function pickFromPool(pool, defectFocusTags, take, excludeIds, excludeTitles) {
  const focus = defectFocusTags.slice(0, 2).filter(Boolean);
  const focusSet = new Set(focus);
  const filtered = pool.filter((t) => {
    const id = t.id;
    const title = String(t.title || "").trim();
    if (!id) return false;
    if (excludeIds.has(id)) return false;
    if (excludeTitles.has(title)) return false;
    return true;
  });
  const sorted = [...filtered].sort((a, b) => {
    const diff = scoreTemplateOverlap(b, focusSet) - scoreTemplateOverlap(a, focusSet);
    if (diff !== 0) return diff;
    return String(a.id).localeCompare(String(b.id));
  });
  const out = [];
  const used = new Set();
  for (const t of sorted) {
    if (out.length >= take) break;
    if (!used.has(t.id)) {
      out.push(t);
      used.add(t.id);
    }
  }
  for (const t of filtered) {
    if (out.length >= take) break;
    if (!used.has(t.id)) {
      out.push(t);
      used.add(t.id);
    }
  }
  return out.slice(0, take);
}

function applyPhaseToTemplate(template, phase, careerExtraBonus = 0) {
  const baseDiff = Number(template.difficulty || 1);
  const bonus = (PHASE_DIFFICULTY_BONUS[phase] ?? 0) + (Number(careerExtraBonus) || 0);
  const difficulty = Math.min(3, Math.max(1, baseDiff + bonus));
  const baseCoin = Number(template.rewardBaseCoin || 120);
  const mult = PHASE_REWARD_MULT[phase] ?? 1;
  const rewardCoin = Math.max(1, Math.round(baseCoin * mult));
  return { difficulty, rewardCoin };
}

function filterPoolByCareerBand(pool, band) {
  if (!pool?.length || !band) return pool || [];
  const minB = Math.max(1, Math.min(3, Number(band.minBase) || 1));
  const maxB = Math.max(minB, Math.min(3, Number(band.maxBase) || 3));
  const filtered = pool.filter((t) => {
    const d = Math.min(3, Math.max(1, Number(t.difficulty) || 1));
    return d >= minB && d <= maxB;
  });
  return filtered.length >= 2 ? filtered : pool;
}

function careerExtraDifficultyBonus(band) {
  if (!band) return 0;
  if (Number(band.minBase) >= 2) return 1;
  return 0;
}

function mergeExcludeFromPicked(picked, excludeIds, excludeTitles) {
  for (const tpl of picked) {
    if (tpl?.id) excludeIds.add(tpl.id);
    const title = String(tpl?.title || "").trim();
    if (title) excludeTitles.add(title);
  }
}

/**
 * 生成当日主线必做（若当日已有任务且未 force / fullRefresh 则跳过）。
 * 不再下发系统「选做」模板；额外工作量请用户通过「自填完成事项」接口登记。
 * 同一自然日同一模板不重复实例化（见 DailyTask @@unique）。
 * force / fullRefresh：均只删除当日「未完成」任务后重排；已完成的难度点与记录保留，并仅补足与目标工作量之间的差额。
 */
async function generateTodayTasksIfNeeded(opts = {}) {
  if (!opts.userId) {
    throw new AppError("USER_ID_REQUIRED", "缺少用户上下文。", 400);
  }
  const userId = opts.userId;
  const force = Boolean(opts.force);
  const fullRefresh = Boolean(opts.fullRefresh);
  const taskDate = opts.taskDate || new Date().toISOString().slice(0, 10);

  /** 清除当日历史「选做」实例，避免仍占排班额度或出现在「今日任务」接口中 */
  await prisma.dailyTask.deleteMany({
    where: { userId, taskDate, sourceType: "optional" },
  });

  const totalToday = await prisma.dailyTask.count({
    where: { userId, taskDate },
  });
  if (!force && !fullRefresh && totalToday > 0) {
    const tasks = await prisma.dailyTask.findMany({
      where: { userId, taskDate },
      orderBy: [{ sourceType: "asc" }, { createdAt: "asc" }],
    });
    return { skipped: true, reason: "already_has_tasks", tasks };
  }

  if (force || fullRefresh) {
    await prisma.dailyTask.deleteMany({
      where: { userId, taskDate, status: { not: "completed" } },
    });
  }

  let plan = await prisma.weeklyProfessionPlan.findFirst({
    where: { userId, isActive: true },
    orderBy: { updatedAt: "desc" },
  });

  const currentWeek = getIsoWeekKey(new Date(`${taskDate}T12:00:00`));
  if (plan && plan.weekKey !== currentWeek) {
    plan = await prisma.weeklyProfessionPlan.update({
      where: { id: plan.id },
      data: {
        weekKey: currentWeek,
        mainlineCompletionsWeek: 0,
        mainlinePhase: "intro",
      },
    });
  }

  const roleCode = plan?.roleCode || "engineer";
  const defectFocus = parseJsonStringArray(plan?.defectFocusTagsJson, ["拖延", "分心"]).slice(0, 2);
  const phase = plan?.mainlinePhase && PHASE_ORDER.includes(plan.mainlinePhase)
    ? plan.mainlinePhase
    : "intro";

  await rollMonthlyCareerIfNeeded(userId, roleCode);
  const careerRow = await prisma.userProfessionCareer.findUnique({
    where: { userId_professionRoleCode: { userId, professionRoleCode: roleCode } },
  });
  const band = careerRow
    ? careerTemplateDifficultyBand(careerRow.careerStage, careerRow.tierInStage)
    : careerTemplateDifficultyBand(1, 1);
  const careerBonus = careerExtraDifficultyBonus(band);

  const userRow = await prisma.user.findUnique({
    where: { id: userId },
    select: { dailyWorkloadTarget: true },
  });
  const workloadTarget = Math.max(6, Math.min(22, Number(userRow?.dailyWorkloadTarget) || 12));

  const existingRows = await prisma.dailyTask.findMany({
    where: { userId, taskDate },
    select: { templateId: true, title: true, difficulty: true, status: true },
  });
  const existingSum = sumTaskDifficulty(existingRows);
  let gap = Math.max(0, workloadTarget - existingSum);
  const hasPending = existingRows.some((r) => r.status === "pending");
  /**
   * 已完成难度点已满当日目标时 gap 为 0；若仍 force/fullRefresh，应补一批新待办，否则会「只剩已完成、刷新不出新任务」。
   * 仅当「没有待完成项」或「差额已为 0」时抬高 gap，避免在正常「只补差额」时多排任务。
   */
  if ((force || fullRefresh) && (!hasPending || gap === 0) && existingRows.length > 0) {
    const floor = Math.max(3, Math.ceil(workloadTarget * 0.45));
    gap = Math.max(gap, floor);
  }

  if (gap <= 0 && existingRows.length > 0 && !force && !fullRefresh) {
    const tasks = await prisma.dailyTask.findMany({
      where: { userId, taskDate },
      orderBy: [{ sourceType: "asc" }, { createdAt: "asc" }],
    });
    const scheduledDifficulty = tasks.reduce((acc, t) => acc + (Number(t.difficulty) || 1), 0);
    return {
      skipped: false,
      tasks,
      meta: {
        roleCode,
        phase,
        defectFocus,
        weekKey: plan?.weekKey || currentWeek,
        workloadTarget,
        scheduledDifficulty,
        refillSkipped: true,
        careerBand: band,
      },
    };
  }

  const excludeIds = new Set(existingRows.map((r) => r.templateId).filter(Boolean));
  const excludeTitles = new Set(
    existingRows.map((r) => String(r.title || "").trim()).filter(Boolean),
  );

  const mainlinePoolRaw = await prisma.taskTemplate.findMany({
    where: {
      userId,
      professionRoleCode: roleCode,
      isMandatoryCandidate: true,
      isMainline: true,
      active: true,
    },
    orderBy: { id: "asc" },
  });

  const fallbackMainlineRaw = await prisma.taskTemplate.findMany({
    where: {
      userId,
      professionRoleCode: "engineer",
      isMandatoryCandidate: true,
      isMainline: true,
      active: true,
    },
    orderBy: { id: "asc" },
  });

  const mainlinePool = filterPoolByCareerBand(mainlinePoolRaw, band);
  const fallbackMainline = filterPoolByCareerBand(fallbackMainlineRaw, band);

  const mainlinePointTarget =
    existingSum === 0
      ? workloadTarget
      : Math.min(MAX_MAINLINE_TASKS * 3, Math.max(0, gap));

  const pool = mainlinePool.length > 0 ? mainlinePool : fallbackMainline;
  const picked = [];
  let mainlineDifficultySum = 0;
  while (mainlineDifficultySum < mainlinePointTarget && picked.length < MAX_MAINLINE_TASKS) {
    const batch = pickFromPool(pool, defectFocus, 1, excludeIds, excludeTitles);
    if (!batch.length) {
      const fb = pickFromPool(fallbackMainline, defectFocus, 1, excludeIds, excludeTitles);
      if (!fb.length) break;
      batch.push(...fb);
    }
    const tpl = batch[0];
    picked.push(tpl);
    const { difficulty } = applyPhaseToTemplate(tpl, phase, careerBonus);
    mainlineDifficultySum += difficulty;
    mergeExcludeFromPicked([tpl], excludeIds, excludeTitles);
  }

  const focusSet = new Set(defectFocus);
  const rows = [];
  const ts = Date.now();

  picked.forEach((tpl, i) => {
    const { difficulty, rewardCoin } = applyPhaseToTemplate(tpl, phase, careerBonus);
    const overlap = scoreTemplateOverlap(tpl, focusSet) > 0;
    rows.push({
      id: `t_ml_${taskDate}_${ts}_${i}`,
      userId,
      templateId: tpl.id,
      title: tpl.title,
      category: tpl.category,
      sourceType: "mandatory",
      status: "pending",
      difficulty,
      rewardCoin,
      isMainline: true,
      targetsWeeklyDefects: overlap,
      taskDate,
      defectTagsJson: tpl.defectTagsJson || "[]",
      detailJson: tpl.detailJson || "{}",
    });
  });

  if (picked.length === 0 && mainlinePointTarget > 0) {
    rows.push({
      id: `t_ml_${taskDate}_${ts}_fill_0`,
      userId,
      templateId: null,
      title: "主线补足：模板不足时请重新执行数据初始化",
      category: "career",
      sourceType: "mandatory",
      status: "pending",
      difficulty: 2,
      rewardCoin: 120,
      isMainline: true,
      targetsWeeklyDefects: true,
      taskDate,
      defectTagsJson: JSON.stringify(defectFocus.length ? defectFocus : ["拖延", "分心"]),
      detailJson: "{}",
    });
    mainlineDifficultySum = 2;
  }

  const firstMandatory = rows.find((r) => r.sourceType === "mandatory");
  if (firstMandatory && defectFocus.length > 0) {
    const hasOverlap = rows.some(
      (r) => r.sourceType === "mandatory" && r.targetsWeeklyDefects,
    );
    if (!hasOverlap) {
      const tags = parseJsonStringArray(firstMandatory.defectTagsJson, []);
      const merged = [...new Set([...tags, ...defectFocus])];
      firstMandatory.defectTagsJson = JSON.stringify(merged);
      firstMandatory.targetsWeeklyDefects = true;
    }
  }

  for (const row of rows) {
    try {
      await prisma.dailyTask.create({ data: row });
    } catch (err) {
      if (err.code === "P2002") {
        continue;
      }
      throw err;
    }
  }

  const tasks = await prisma.dailyTask.findMany({
    where: { userId, taskDate },
    orderBy: [{ sourceType: "asc" }, { createdAt: "asc" }],
  });

  const scheduledDifficulty = tasks.reduce((acc, t) => acc + (Number(t.difficulty) || 1), 0);
  return {
    skipped: false,
    tasks,
    meta: {
      roleCode,
      phase,
      defectFocus,
      weekKey: plan?.weekKey || currentWeek,
      workloadTarget,
      scheduledDifficulty,
      careerBand: band,
    },
  };
}

async function recordMainlineCompletionAfterTask(userId, task) {
  if (!task || task.sourceType !== "mandatory" || !task.isMainline || task.status !== "completed") {
    return null;
  }

  const plan = await prisma.weeklyProfessionPlan.findFirst({
    where: { userId, isActive: true },
    orderBy: { updatedAt: "desc" },
  });
  if (!plan) return null;

  const nextCount = (plan.mainlineCompletionsWeek || 0) + 1;
  const nextPhase = phaseFromCompletions(nextCount);

  return prisma.weeklyProfessionPlan.update({
    where: { id: plan.id },
    data: {
      mainlineCompletionsWeek: nextCount,
      mainlinePhase: nextPhase,
    },
  });
}

module.exports = {
  getIsoWeekKey,
  parseJsonStringArray,
  generateTodayTasksIfNeeded,
  recordMainlineCompletionAfterTask,
  phaseFromCompletions,
  applyPhaseToTemplate,
};
