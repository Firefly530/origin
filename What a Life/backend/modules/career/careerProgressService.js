const { prisma } = require("../../db/prisma");
const { getStageLabel, titleForLevel } = require("../../db/careerTitles");

function currentMonthKey(d = new Date()) {
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  return `${y}-${String(m).padStart(2, "0")}`;
}

function nextMonthKey(monthKey) {
  const m = /^(\d{4})-(\d{2})$/.exec(String(monthKey || "").trim());
  if (!m) return currentMonthKey();
  let y = Number(m[1]);
  let mo = Number(m[2]) + 1;
  if (mo > 12) {
    mo = 1;
    y += 1;
  }
  return `${y}-${String(mo).padStart(2, "0")}`;
}

function monthKeyBefore(a, b) {
  if (!a || !b) return false;
  return String(a).localeCompare(String(b)) < 0;
}

/** 主线必做完成一条对「月度晋升复杂分」的贡献：难度越高越算“复杂工作” */
function complexScoreForCompletedTask(task) {
  if (!task || task.sourceType !== "mandatory" || !task.isMainline) return 0;
  const d = Math.min(3, Math.max(1, Number(task.difficulty) || 1));
  return d * d;
}

/**
 * 与「难度点」体系对齐的月度晋升门槛：随用户日目标工作量、生涯阶段略升。
 * 未达标则该自然月结束时失去一次晋升机会（职称不变）。
 */
function monthlyPromotionThreshold(dailyWorkloadTarget, careerStage, tierInStage) {
  const w = Math.max(6, Math.min(22, Number(dailyWorkloadTarget) || 12));
  const stage = Math.max(1, Math.min(3, Number(careerStage) || 1));
  const tier = Math.max(1, Math.min(6, Number(tierInStage) || 1));
  const factor = 5.5 + stage * 0.8 + tier * 0.15;
  return Math.max(28, Math.round(w * factor));
}

function maxCareerLevel() {
  return 18;
}

function levelOrderFromProgress(row) {
  const s = Math.max(1, Math.min(3, Number(row.careerStage) || 1));
  const t = Math.max(1, Math.min(6, Number(row.tierInStage) || 1));
  return (s - 1) * 6 + t;
}

function advanceProgress(row) {
  let { careerStage, tierInStage } = row;
  careerStage = Math.max(1, Math.min(3, Number(careerStage) || 1));
  tierInStage = Math.max(1, Math.min(6, Number(tierInStage) || 1));
  if (careerStage === 3 && tierInStage >= 6) {
    return { careerStage: 3, tierInStage: 6, promoted: false, capped: true };
  }
  let promoted = true;
  tierInStage += 1;
  if (tierInStage > 6) {
    tierInStage = 1;
    careerStage += 1;
  }
  if (careerStage > 3) {
    careerStage = 3;
    tierInStage = 6;
    return { careerStage: 3, tierInStage: 6, promoted: false, capped: true };
  }
  return { careerStage, tierInStage, promoted, capped: false };
}

async function ensureUserProfessionCareer(userId, professionRoleCode) {
  const id = `upc_${userId}_${professionRoleCode}`.replace(/[^a-zA-Z0-9_-]/g, "_");
  const monthKey = currentMonthKey();
  return prisma.userProfessionCareer.upsert({
    where: { userId_professionRoleCode: { userId, professionRoleCode } },
    create: {
      id,
      userId,
      professionRoleCode,
      careerStage: 1,
      tierInStage: 1,
      trackingMonthKey: monthKey,
      monthPromotionPoints: 0,
      lastEvaluatedMonthKey: "",
    },
    update: {},
  });
}

/**
 * 若 tracking 月份落后于当前自然月，则依次结算旧月晋升；未达标则该月晋升机会作废。
 */
async function rollMonthlyCareerIfNeeded(userId, professionRoleCode) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { dailyWorkloadTarget: true },
  });
  const workload = user?.dailyWorkloadTarget ?? 12;
  const targetMonth = currentMonthKey();

  let row = await ensureUserProfessionCareer(userId, professionRoleCode);
  if (!row.trackingMonthKey) {
    return prisma.userProfessionCareer.update({
      where: { id: row.id },
      data: { trackingMonthKey: targetMonth, monthPromotionPoints: 0 },
    });
  }

  while (monthKeyBefore(row.trackingMonthKey, targetMonth)) {
    const evalMonth = row.trackingMonthKey;
    const threshold = monthlyPromotionThreshold(workload, row.careerStage, row.tierInStage);
    const pts = Number(row.monthPromotionPoints) || 0;
    let nextStage = row.careerStage;
    let nextTier = row.tierInStage;

    if (pts >= threshold) {
      const adv = advanceProgress(row);
      if (adv.promoted) {
        nextStage = adv.careerStage;
        nextTier = adv.tierInStage;
        await prisma.eventRecord.create({
          data: {
            id: `evt_${userId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            userId,
            dailyTaskId: null,
            eventType: "career",
            direction: "positive",
            triggerReason: `monthly_promotion_ok:${evalMonth}`,
            effectJson: JSON.stringify({
              professionRoleCode,
              newStage: nextStage,
              newTier: nextTier,
              points: pts,
              threshold,
            }),
          },
        });
      }
    } else if (levelOrderFromProgress(row) < maxCareerLevel()) {
      await prisma.eventRecord.create({
        data: {
          id: `evt_${userId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          userId,
          dailyTaskId: null,
          eventType: "career",
          direction: "neutral",
          triggerReason: `monthly_promotion_missed:${evalMonth}`,
          effectJson: JSON.stringify({
            professionRoleCode,
            points: pts,
            threshold,
            message: "未达成本月复杂工作门槛，本次晋升机会已失去。",
          }),
        },
      });
    }

    row = await prisma.userProfessionCareer.update({
      where: { id: row.id },
      data: {
        careerStage: nextStage,
        tierInStage: nextTier,
        trackingMonthKey: nextMonthKey(evalMonth),
        monthPromotionPoints: 0,
        lastEvaluatedMonthKey: evalMonth,
      },
    });
  }

  return row;
}

async function addMonthlyPromotionPointsForCompletedTask(userId, professionRoleCode, task) {
  const add = complexScoreForCompletedTask(task);
  if (add <= 0) return null;
  const rowAfterRoll = await rollMonthlyCareerIfNeeded(userId, professionRoleCode);
  const monthKey = currentMonthKey();
  if (!rowAfterRoll || rowAfterRoll.trackingMonthKey !== monthKey) return rowAfterRoll;

  return prisma.userProfessionCareer.update({
    where: { id: rowAfterRoll.id },
    data: { monthPromotionPoints: { increment: add } },
  });
}

async function getMonthlyCareerSnapshot(userId, professionRoleCode, userRow) {
  if (!professionRoleCode) return null;
  const row = await rollMonthlyCareerIfNeeded(userId, professionRoleCode);
  const workload = userRow?.dailyWorkloadTarget ?? 12;
  const threshold = monthlyPromotionThreshold(workload, row.careerStage, row.tierInStage);
  const levelOrder = levelOrderFromProgress(row);
  const title = titleForLevel(professionRoleCode, levelOrder);
  const stageLabel = getStageLabel(row.careerStage);

  return {
    professionRoleCode,
    monthKey: row.trackingMonthKey || currentMonthKey(),
    careerStage: row.careerStage,
    careerStageLabel: stageLabel,
    tierInStage: row.tierInStage,
    levelOrder,
    title,
    monthPromotionPoints: row.monthPromotionPoints || 0,
    promotionThreshold: threshold,
    complexScoreRule: "当月已完成的主线必做：每条贡献 难度² 分（1→1，2→4，3→9）",
    atMaxLevel: levelOrder >= maxCareerLevel(),
  };
}

/** 供调度器：按生涯全局等级（1–18）映射模板难度偏好 */
function careerTemplateDifficultyBand(careerStage, tierInStage) {
  const level = (Math.max(1, Math.min(3, careerStage)) - 1) * 6 + Math.max(1, Math.min(6, tierInStage));
  if (level <= 6) return { minBase: 1, maxBase: 2, phaseBonusCap: 1 };
  if (level <= 12) return { minBase: 1, maxBase: 3, phaseBonusCap: 2 };
  return { minBase: 2, maxBase: 3, phaseBonusCap: 2 };
}

module.exports = {
  currentMonthKey,
  complexScoreForCompletedTask,
  monthlyPromotionThreshold,
  rollMonthlyCareerIfNeeded,
  addMonthlyPromotionPointsForCompletedTask,
  getMonthlyCareerSnapshot,
  careerTemplateDifficultyBand,
  ensureUserProfessionCareer,
  maxCareerLevel,
  levelOrderFromProgress,
};
