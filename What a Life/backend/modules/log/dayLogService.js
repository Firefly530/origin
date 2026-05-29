const { prisma } = require("../../db/prisma");

function normalizeLogDate(raw) {
  const s = String(raw || "").trim().slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  return new Date().toISOString().slice(0, 10);
}

/**
 * 合并「已完成任务」与「自行记录的奖励」为时间线，供前端「今日日志」展示。
 */
async function getDayLog(userId, logDate) {
  const date = normalizeLogDate(logDate);
  const dayStart = new Date(`${date}T00:00:00.000Z`);
  const dayEnd = new Date(dayStart);
  dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

  const [tasks, selfRewards, petEvents] = await Promise.all([
    prisma.dailyTask.findMany({
      where: { userId, taskDate: date, status: "completed" },
      orderBy: [{ completedAt: "asc" }, { updatedAt: "asc" }],
    }),
    prisma.dailySelfReward.findMany({
      where: { userId, logDate: date },
      orderBy: { createdAt: "asc" },
    }),
    prisma.eventRecord.findMany({
      where: {
        userId,
        eventType: { startsWith: "pet_" },
        triggeredAt: { gte: dayStart, lt: dayEnd },
      },
      orderBy: { triggeredAt: "asc" },
    }),
  ]);

  const entries = [];

  for (const t of tasks) {
    const qs = Number(t.qualityScore) || 1;
    const earned = Math.round(Number(t.rewardCoin) * qs);
    entries.push({
      kind: "task_completed",
      id: t.id,
      at: t.completedAt ? t.completedAt.toISOString() : null,
      title: t.title,
      isMainline: Boolean(t.isMainline),
      sourceType: t.sourceType,
      rewardCoinEarned: earned,
      difficulty: t.difficulty,
      reflection: t.reflection || null,
    });
  }

  for (const r of selfRewards) {
    entries.push({
      kind: "self_reward",
      id: r.id,
      at: r.createdAt.toISOString(),
      title: r.title,
      amountCents: r.amountCents,
      budgetPercentBps: r.budgetPercentBps,
      coinSpent: r.coinSpent,
      note: r.note || null,
    });
  }

  for (const pe of petEvents) {
    entries.push({
      kind: "pet_event",
      id: pe.id,
      at: pe.triggeredAt.toISOString(),
      title: pe.triggerReason,
      eventType: pe.eventType,
    });
  }

  entries.sort((a, b) => {
    const ta = a.at ? Date.parse(a.at) : 0;
    const tb = b.at ? Date.parse(b.at) : 0;
    return ta - tb;
  });

  return { logDate: date, entries };
}

module.exports = { getDayLog, normalizeLogDate };
