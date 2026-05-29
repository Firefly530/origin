const { prisma } = require("../../db/prisma");
const { AppError } = require("../../core/errors");

async function evaluateDailyConsequences(userId) {
  const today = new Date().toISOString().slice(0, 10);
  const missedMandatory = await prisma.dailyTask.findMany({
    where: {
      userId,
      taskDate: today,
      sourceType: "mandatory",
      status: "pending",
    },
  });

  if (missedMandatory.length === 0) {
    const consequences = await prisma.consequenceState.findMany({
      where: { userId, active: true },
    });
    return { activated: false, consequences };
  }

  const existing = await prisma.consequenceState.findFirst({
    where: {
      userId,
      type: "missed_daily_mandatory",
      active: true,
    },
    orderBy: { createdAt: "desc" },
  });
  if (existing) {
    const consequences = await prisma.consequenceState.findMany({
      where: { userId, active: true },
      orderBy: { createdAt: "desc" },
    });
    return { activated: false, reason: "already_active", consequences };
  }

  const consequence = await prisma.consequenceState.create({
    data: {
      id: `cons_${Date.now()}`,
      type: "missed_daily_mandatory",
      effect: "tomorrow_recovery_task",
      penaltyCoinRate: 0.3,
      active: true,
      userId,
    },
  });

  const consequences = await prisma.consequenceState.findMany({
    where: { userId, active: true },
  });
  return { activated: true, consequence, consequences };
}

async function getCurrentConsequences(userId) {
  const consequences = await prisma.consequenceState.findMany({
    where: { userId, active: true },
    orderBy: { createdAt: "desc" },
  });
  if (!Array.isArray(consequences)) {
    throw new AppError("CONSEQUENCE_READ_FAILED", "Failed to load consequence states.", 500);
  }
  return consequences;
}

module.exports = {
  evaluateDailyConsequences,
  getCurrentConsequences,
};
