const { prisma } = require("../../db/prisma");

/** 与「每日约 90% 工作量 × 7 天」对齐的周生涯目标系数 */
const WEEKLY_TARGET_RATIO = 0.9;

const CAREER_TIERS = [
  { key: "tier55", ratio: 0.55, coins: 40, label: "进取档" },
  { key: "tier75", ratio: 0.75, coins: 70, label: "稳健档" },
  { key: "tier100", ratio: 1, coins: 120, label: "通关档" },
];

function parseIsoWeekKey(weekKey) {
  const m = /^(\d{4})-W(\d{2})$/.exec(String(weekKey || "").trim());
  if (!m) return null;
  return { year: Number(m[1]), week: Number(m[2]) };
}

/**
 * ISO 周（UTC 周一）的 7 个 YYYY-MM-DD，与 `toISOString().slice(0,10)` 存 taskDate 的方式一致。
 */
function getDateStringsForIsoWeek(year, week) {
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const dow = jan4.getUTCDay() || 7;
  const week1Monday = new Date(jan4);
  week1Monday.setUTCDate(jan4.getUTCDate() - dow + 1);
  const monday = new Date(week1Monday);
  monday.setUTCDate(week1Monday.getUTCDate() + (week - 1) * 7);
  const out = [];
  for (let i = 0; i < 7; i += 1) {
    const d = new Date(monday);
    d.setUTCDate(monday.getUTCDate() + i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

function parseClaimedJson(raw) {
  try {
    const v = JSON.parse(raw || "{}");
    return v && typeof v === "object" ? v : {};
  } catch {
    return {};
  }
}

async function sumCompletedDifficultyInDates(userId, dates) {
  if (!dates.length) return 0;
  const rows = await prisma.dailyTask.findMany({
    where: {
      userId,
      taskDate: { in: dates },
      status: "completed",
      sourceType: { not: "optional" },
    },
    select: { difficulty: true },
  });
  return rows.reduce((acc, t) => acc + (Number(t.difficulty) || 1), 0);
}

function weeklyCareerTargetPoints(dailyWorkloadTarget) {
  const w = Math.max(6, Math.min(22, Number(dailyWorkloadTarget) || 12));
  return Math.round(WEEKLY_TARGET_RATIO * w * 7);
}

/**
 * 供仪表盘展示；不发放奖励。
 */
async function getWeeklyCareerSnapshot(userId, userRow, weeklyPlan) {
  if (!weeklyPlan?.weekKey) {
    return null;
  }
  const parsed = parseIsoWeekKey(weeklyPlan.weekKey);
  if (!parsed) return null;
  const dates = getDateStringsForIsoWeek(parsed.year, parsed.week);
  const earned = await sumCompletedDifficultyInDates(userId, dates);
  const target = weeklyCareerTargetPoints(userRow?.dailyWorkloadTarget);
  const pct = target > 0 ? Math.min(1, earned / target) : 0;
  const claimed = parseClaimedJson(weeklyPlan.careerBonusClaimedJson);

  let roleRow = weeklyPlan.role;
  if (!roleRow && weeklyPlan.roleCode) {
    roleRow = await prisma.professionRole.findUnique({
      where: { code: weeklyPlan.roleCode },
    });
  }

  let blueprint = {};
  try {
    blueprint = JSON.parse(roleRow?.mainlineBlueprintJson || "{}");
  } catch {
    blueprint = {};
  }
  const narrative =
    blueprint.weeklyCareerSummary ||
    roleRow?.description ||
    "完成本周每日任务，推进你的职业周挑战。";
  const title =
    blueprint.weeklyCareerTitle ||
    blueprint.mainlineName ||
    "本周生涯";

  const tiers = CAREER_TIERS.map((t) => ({
    key: t.key,
    label: t.label,
    thresholdPct: Math.round(t.ratio * 100),
    coins: t.coins,
    reached: earned >= target * t.ratio,
    claimed: Boolean(claimed[t.key]),
  }));

  return {
    weekKey: weeklyPlan.weekKey,
    title,
    narrative,
    targetPoints: target,
    earnedPoints: earned,
    percent: Math.round(pct * 1000) / 10,
    cleared: earned >= target,
    tiers,
  };
}

/**
 * 任务完成后尝试发放未领取的档位奖励（幂等）。
 */
async function tryGrantWeeklyCareerTiers(userId) {
  const plan = await prisma.weeklyProfessionPlan.findFirst({
    where: { userId, isActive: true },
    orderBy: { updatedAt: "desc" },
  });
  if (!plan?.weekKey) return { granted: [], earned: 0, target: 0 };

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { dailyWorkloadTarget: true },
  });
  const target = weeklyCareerTargetPoints(user?.dailyWorkloadTarget);
  const parsed = parseIsoWeekKey(plan.weekKey);
  if (!parsed || target <= 0) return { granted: [], earned: 0, target };

  const dates = getDateStringsForIsoWeek(parsed.year, parsed.week);
  const earned = await sumCompletedDifficultyInDates(userId, dates);
  const granted = [];

  await prisma.$transaction(async (tx) => {
    const fresh = await tx.weeklyProfessionPlan.findUnique({ where: { id: plan.id } });
    if (!fresh) return;
    const c = parseClaimedJson(fresh.careerBonusClaimedJson);
    const next = { ...c };
    let coinDelta = 0;
    let repBonus = 0;

    for (const tier of CAREER_TIERS) {
      if (earned < target * tier.ratio) continue;
      if (next[tier.key]) continue;
      next[tier.key] = true;
      coinDelta += tier.coins;
      if (tier.key === "tier100") repBonus = 5;
      granted.push({ key: tier.key, coins: tier.coins, label: tier.label });
    }

    if (coinDelta > 0) {
      await tx.weeklyProfessionPlan.update({
        where: { id: plan.id },
        data: { careerBonusClaimedJson: JSON.stringify(next) },
      });
      await tx.wallet.upsert({
        where: { userId },
        create: {
          userId,
          coinBalance: coinDelta,
          energy: 100,
          reputation: repBonus || 0,
        },
        update: {
          coinBalance: { increment: coinDelta },
          ...(repBonus ? { reputation: { increment: repBonus } } : {}),
        },
      });
    }
  });

  return { granted, earned, target };
}

module.exports = {
  getWeeklyCareerSnapshot,
  tryGrantWeeklyCareerTiers,
  weeklyCareerTargetPoints,
  getDateStringsForIsoWeek,
  parseIsoWeekKey,
};
