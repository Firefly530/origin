const { prisma } = require("./prisma");
const { ROLE_PACKS } = require("./rolePacks");

/** 演示玩家（兼容旧库模板 id） */
const USER_ID = "local-user";
const ROOT_USER_ID = "user_root";
const DEFAULT_WEEK_KEY = "2026-W18";

async function migrateLegacyProfessionCodes() {
  const pairs = [
    ["architect", "programmer"],
    ["communicator", "psychologist"],
  ];
  for (const [from, to] of pairs) {
    const old = await prisma.professionRole.findUnique({ where: { code: from } });
    if (!old) continue;
    await prisma.taskTemplate.updateMany({
      where: { professionRoleCode: from },
      data: { professionRoleCode: to },
    });
    await prisma.weeklyProfessionPlan.updateMany({
      where: { roleCode: from },
      data: { roleCode: to },
    });
    await prisma.chatSession.updateMany({
      where: { roleCode: from },
      data: { roleCode: to },
    });
    await prisma.professionRole.delete({ where: { code: from } });
  }
}

function mainlineDefectTagsJson(role, index) {
  const baseFocus = ["拖延", "分心"];
  if (index === 0) {
    const extra = role.mainline0ExtraDefects || [];
    return JSON.stringify([...new Set([...baseFocus, ...extra, "缺点改善"])]);
  }
  if (role.category === "career") {
    return JSON.stringify(["拖延", "回避困难题", "分心"]);
  }
  return JSON.stringify(["熬夜", "中断后难恢复", "手机分心"]);
}

function goalIdsForUser(userId) {
  if (userId === USER_ID) {
    return {
      exam: "goal_exam_2026",
      habit: "goal_habit_stability",
      career: "goal_career_simulation",
      resource: "goal_resource_guardrail",
    };
  }
  return {
    exam: `goal_exam_${userId}`,
    habit: `goal_habit_${userId}`,
    career: `goal_career_${userId}`,
    resource: `goal_resource_${userId}`,
  };
}

/** 与 ROLE_PACKS 当前定义一致；用于判断是否需要全量重种模板（避免每次启动都跑数百次 upsert） */
function getExpectedTaskTemplateCount() {
  return ROLE_PACKS.reduce((acc, role) => acc + (role.mainlineBundle?.length || 0), 0);
}

function buildRoleTemplates(role = {}, userId) {
  const legacy = userId === USER_ID;
  const mid = legacy ? role.code : `${userId}_${role.code}`;
  const bundle = role.mainlineBundle || [];
  return bundle.map((item, index) => {
    const difficulty = index < 3 ? 1 : index < 7 ? 2 : 3;
    return {
      id: `tpl_${mid}_m${String(index + 1).padStart(3, "0")}`,
      title: item.title,
      roleCode: role.code,
      sourceType: "mandatory",
      category: role.category,
      difficulty,
      rewardBaseCoin: role.mainlineRewardCoin,
      expectedMinutes: role.category === "career" ? 90 : 35,
      isMainline: true,
      mainlineTrack: role.mainlineName,
      defectTagsJson: mainlineDefectTagsJson(role, index),
      detailJson: JSON.stringify({
        howTo: item.howTo,
        why: item.why,
        step: item.step ?? index + 1,
        track: role.mainlineName || "",
      }),
    };
  });
}

async function seedRoles() {
  const roles = ROLE_PACKS.map((role) => ({
    code: role.code,
    displayName: role.displayName,
    focus: role.focus,
    description: role.description,
    rewardMultiplierJson: JSON.stringify(role.rewardMultiplierJson),
    taskRatioJson: JSON.stringify(role.taskRatioJson),
    mainlineBlueprintJson: JSON.stringify({
      mainlineName: role.mainlineName,
      mainlineCount: role.mainlineBundle?.length || 0,
      supportCount: 0,
      weeklyCareerTitle: role.weeklyCareerTitle || `本周生涯：${role.mainlineName}`,
      weeklyCareerSummary: role.weeklyCareerSummary || "",
    }),
  }));

  for (const role of roles) {
    await prisma.professionRole.upsert({
      where: { code: role.code },
      create: role,
      update: role,
    });
  }
}

async function seedGoalsAndTemplatesForUser(userId) {
  const expectedTemplates = getExpectedTaskTemplateCount();
  const tplCount = await prisma.taskTemplate.count({ where: { userId } });
  /** 少于期望要补种；多于期望（旧版本种子）也要清掉多余模板，避免与当前 ROLE_PACKS 脱节 */
  const needsFullTemplateReseed = tplCount !== expectedTemplates;

  if (needsFullTemplateReseed) {
    const taskRows = await prisma.dailyTask.findMany({
      where: { userId },
      select: { id: true },
    });
    const taskIds = taskRows.map((t) => t.id);
    if (taskIds.length > 0) {
      await prisma.completionLog.deleteMany({ where: { dailyTaskId: { in: taskIds } } });
    }
    await prisma.dailyTask.deleteMany({ where: { userId } });
    await prisma.taskTemplate.deleteMany({ where: { userId } });
  }

  const g = goalIdsForUser(userId);
  const goals = [
    {
      id: g.exam,
      title: "2026 考研冲刺",
      goalType: "career",
      priority: 5,
      difficulty: 3,
      expectedMinutes: 120,
      cycleRule: "daily",
      defectTagsJson: JSON.stringify(["拖延", "分心"]),
    },
    {
      id: g.habit,
      title: "作息与执行稳定性",
      goalType: "habit",
      priority: 4,
      difficulty: 2,
      expectedMinutes: 45,
      cycleRule: "daily",
      defectTagsJson: JSON.stringify(["熬夜", "中断后难恢复"]),
    },
    {
      id: g.career,
      title: "职业角色成长主线",
      goalType: "career",
      priority: 4,
      difficulty: 2,
      expectedMinutes: 80,
      cycleRule: "weekly",
      defectTagsJson: JSON.stringify(["缺乏反馈", "策略漂移"]),
    },
    {
      id: g.resource,
      title: "预算与奖励平衡",
      goalType: "habit",
      priority: 3,
      difficulty: 2,
      expectedMinutes: 25,
      cycleRule: "daily",
      defectTagsJson: JSON.stringify(["冲动消费", "奖励失衡"]),
    },
  ];

  for (const goal of goals) {
    await prisma.goal.upsert({
      where: { id: goal.id },
      create: { userId, ...goal },
      update: { ...goal },
    });
  }

  if (!needsFullTemplateReseed) {
    return;
  }

  const templates = ROLE_PACKS.flatMap((role) => buildRoleTemplates(role, userId));
  const rows = templates.map((template) => {
    let goalId = template.category === "career" ? g.exam : g.habit;
    if (template.roleCode === "financier") {
      goalId = g.resource;
    } else if (template.roleCode === "mentor") {
      goalId = g.career;
    }
    return {
      id: template.id,
      userId,
      goalId,
      professionRoleCode: template.roleCode,
      title: template.title,
      category: template.category,
      sourceType: template.sourceType,
      difficulty: template.difficulty,
      priority: template.difficulty + 2,
      expectedMinutes: template.expectedMinutes,
      rewardBaseCoin: template.rewardBaseCoin,
      defectTagsJson: template.defectTagsJson,
      qualityWeight: 1.0,
      isMandatoryCandidate: template.sourceType === "mandatory",
      isMainline: template.isMainline,
      mainlineTrack: template.mainlineTrack || null,
      detailJson: template.detailJson || "{}",
      active: true,
    };
  });

  const BATCH = 50;
  await prisma.$transaction(async (tx) => {
    for (let i = 0; i < rows.length; i += BATCH) {
      await tx.taskTemplate.createMany({ data: rows.slice(i, i + BATCH) });
    }
  });
}

async function seedRewards() {
  /**
   * 奖励「名称」不落库中文商品名，仅保留档位槽位代号；展示名必须由「AI 重写奖励清单」写入 personalization。
   * 代币、预算万分比、兑换次数等仍由种子提供，供 AI 评估占比时作参考。
   */
  const rewards = [
    {
      id: "reward_S_drink",
      rewardType: "real_world_reward",
      title: "TIER_SLOT_S",
      tier: "S",
      coinCost: 180,
      budgetCostCents: 2000,
      budgetPercentBps: 800,
      dailyLimit: 3,
      weeklyLimit: 14,
      cooldownMinutes: 60,
    },
    {
      id: "reward_A_lightmeal",
      rewardType: "real_world_reward",
      title: "TIER_SLOT_A",
      tier: "A",
      coinCost: 320,
      budgetCostCents: 4000,
      budgetPercentBps: 1600,
      dailyLimit: 2,
      weeklyLimit: 8,
      cooldownMinutes: 120,
    },
    {
      id: "reward_B_activity",
      rewardType: "real_world_reward",
      title: "TIER_SLOT_B",
      tier: "B",
      coinCost: 700,
      budgetCostCents: 8000,
      budgetPercentBps: 3200,
      dailyLimit: 1,
      weeklyLimit: 2,
      cooldownMinutes: 360,
    },
    {
      id: "reward_C_dinner",
      rewardType: "real_world_reward",
      title: "TIER_SLOT_C",
      tier: "C",
      coinCost: 1200,
      budgetCostCents: 15000,
      budgetPercentBps: 6000,
      dailyLimit: 1,
      weeklyLimit: 1,
      cooldownMinutes: 720,
    },
    {
      id: "reward_X_milestone",
      rewardType: "milestone_memorial",
      title: "TIER_SLOT_X",
      tier: "X",
      coinCost: 1800,
      budgetCostCents: 0,
      budgetPercentBps: null,
      dailyLimit: 0,
      weeklyLimit: 1,
      cooldownMinutes: 1440,
    },
  ];
  for (const reward of rewards) {
    await prisma.rewardCatalog.upsert({
      where: { id: reward.id },
      create: reward,
      update: reward,
    });
  }
}

async function ensureBudgetGuardForUser(userId) {
  await prisma.budgetGuard.upsert({
    where: { userId },
    create: {
      userId,
      dailyBudgetCents: 25000,
      tierDailyLimitJson: JSON.stringify({ S: 3, A: 2, B: 1, C: 1, X: 0 }),
      weekendOnlyTierJson: JSON.stringify(["X"]),
      weeklyCompletionForX: 0.85,
      coinPerBudgetUnit: 10,
      mandatoryCoinBoost: 1.8,
    },
    update: {
      dailyBudgetCents: 25000,
      tierDailyLimitJson: JSON.stringify({ S: 3, A: 2, B: 1, C: 1, X: 0 }),
      weekendOnlyTierJson: JSON.stringify(["X"]),
      weeklyCompletionForX: 0.85,
      coinPerBudgetUnit: 10,
      mandatoryCoinBoost: 1.8,
    },
  });
}

async function seedConsequenceRules() {
  const rules = [
    {
      id: "rule_missed_daily_mandatory",
      triggerType: "missed_daily",
      triggerConditionJson: JSON.stringify({ sourceType: "mandatory", missedCount: 1 }),
      effectJson: JSON.stringify({ coinPenaltyRate: 0.3, breakStreak: true, addRecoveryTask: true }),
      severity: 2,
      priority: 100,
    },
    {
      id: "rule_weekly_under_70",
      triggerType: "low_weekly_completion",
      triggerConditionJson: JSON.stringify({ mandatoryCompletionRateLt: 0.7 }),
      effectJson: JSON.stringify({
        freezeTierX: true,
        freezeCareerLevelUp: true,
        riskEventBoost: 0.2,
        note: "freezeCareerLevelUp：语义上冻结「月度职称晋升」机会（产品层可据此禁用自动晋升或提高门槛）",
      }),
      severity: 3,
      priority: 90,
    },
    {
      id: "rule_weekly_under_50",
      triggerType: "low_weekly_completion",
      triggerConditionJson: JSON.stringify({ mandatoryCompletionRateLt: 0.5 }),
      effectJson: JSON.stringify({ forceRecoveryWeek: true, reduceDifficultyRatio: 0.3 }),
      severity: 4,
      priority: 80,
    },
  ];

  for (const rule of rules) {
    await prisma.consequenceRule.upsert({
      where: { id: rule.id },
      create: rule,
      update: rule,
    });
  }
}

async function seedCareerNodes() {
  const { buildCareerNodesForSeed } = require("./careerTitles");
  const nodes = buildCareerNodesForSeed();
  await prisma.careerNode.deleteMany({});
  await prisma.careerNode.createMany({ data: nodes });
}

async function ensureRootAccount() {
  const { hashPassword } = require("../modules/auth/authService");
  const existing = await prisma.user.findUnique({ where: { id: ROOT_USER_ID } });
  if (!existing) {
    await prisma.user.create({
      data: {
        id: ROOT_USER_ID,
        displayName: "根管理员",
        loginUsername: "root",
        passwordHash: await hashPassword("123456"),
        accountRole: "root",
        dailyBudgetCents: 25000,
        dailyWorkloadTarget: 12,
        onboardingStep: "done",
      },
    });
  } else {
    const patch = {};
    if (!existing.loginUsername) patch.loginUsername = "root";
    if (!existing.passwordHash) patch.passwordHash = await hashPassword("123456");
    if (!existing.accountRole || existing.accountRole === "player") patch.accountRole = "root";
    if (Object.keys(patch).length) {
      await prisma.user.update({ where: { id: ROOT_USER_ID }, data: patch });
    }
  }
  await prisma.wallet.upsert({
    where: { userId: ROOT_USER_ID },
    create: { userId: ROOT_USER_ID, coinBalance: 0, energy: 100, reputation: 0 },
    update: {},
  });
  await ensureBudgetGuardForUser(ROOT_USER_ID);
}

async function ensureLocalDemoAccount() {
  const { hashPassword } = require("../modules/auth/authService");
  await prisma.user.upsert({
    where: { id: USER_ID },
    create: {
      id: USER_ID,
      displayName: "演示玩家",
      loginUsername: "player",
      passwordHash: await hashPassword("123456"),
      accountRole: "player",
      dailyBudgetCents: 25000,
      dailyWorkloadTarget: 12,
      onboardingStep: "done",
    },
    update: {
      onboardingStep: "done",
      dailyWorkloadTarget: 12,
    },
  });
  const u = await prisma.user.findUnique({ where: { id: USER_ID } });
  if (u && (!u.loginUsername || !u.passwordHash)) {
    await prisma.user.update({
      where: { id: USER_ID },
      data: {
        loginUsername: u.loginUsername || "player",
        passwordHash: u.passwordHash || (await hashPassword("123456")),
        accountRole: u.accountRole === "root" ? "root" : "player",
      },
    });
  }
  await prisma.wallet.upsert({
    where: { userId: USER_ID },
    create: { userId: USER_ID, coinBalance: 1200, energy: 100, reputation: 0 },
    update: {},
  });
}

/**
 * 为玩家/开发人员准备完整游戏数据（任务模板、周计划等）。root 管理账号不需要调用。
 */
async function ensureUserGameSeed(userId, displayName) {
  if (userId === ROOT_USER_ID) return;
  if (displayName) {
    await prisma.user.update({
      where: { id: userId },
      data: { displayName: String(displayName).trim() || undefined },
    });
  }
  await prisma.wallet.upsert({
    where: { userId },
    create: { userId, coinBalance: 1200, energy: 100, reputation: 0 },
    update: {},
  });
  await seedGoalsAndTemplatesForUser(userId);
  await ensureBudgetGuardForUser(userId);

  const weeklyPlanId = userId === USER_ID ? "weekly-default" : `wp_${userId}`;
  await prisma.weeklyProfessionPlan.upsert({
    where: { id: weeklyPlanId },
    create: {
      id: weeklyPlanId,
      userId,
      weekKey: DEFAULT_WEEK_KEY,
      roleCode: "engineer",
      changedCount: 0,
      isActive: true,
      mainlinePhase: "intro",
      mainlineCompletionsWeek: 0,
      defectFocusTagsJson: JSON.stringify(["拖延", "分心"]),
    },
    update: {
      defectFocusTagsJson: JSON.stringify(["拖延", "分心"]),
    },
  });

  const today = new Date().toISOString().slice(0, 10);
  await prisma.attributeSnapshot.upsert({
    where: { userId_snapshotDate: { userId, snapshotDate: today } },
    create: {
      id: `attr_${userId}_${today}`,
      userId,
      snapshotDate: today,
      discipline: 55,
      execution: 58,
      focus: 57,
      physical: 52,
      emotional: 50,
      professional: 60,
      exp: 1200,
      coinBalance: 1200,
      energy: 100,
      reputation: 0,
    },
    update: {},
  });

  const { generateTodayTasksIfNeeded } = require("../modules/scheduler/dailySchedulerService");
  await generateTodayTasksIfNeeded({ userId, force: false });
}

async function initializeDatabase() {
  await seedRoles();
  await migrateLegacyProfessionCodes();
  await Promise.all([seedCareerNodes(), seedConsequenceRules(), seedRewards()]);

  await ensureRootAccount();
  await ensureLocalDemoAccount();
  await ensureUserGameSeed(USER_ID, "演示玩家");
}

module.exports = {
  USER_ID,
  ROOT_USER_ID,
  initializeDatabase,
  ensureUserGameSeed,
};
