const { prisma } = require("../../db/prisma");
const { AppError } = require("../../core/errors");

async function getWeeklyReport(userId) {
  const tasks = await prisma.dailyTask.findMany({ where: { userId } });
  if (!Array.isArray(tasks)) {
    throw new AppError("WEEKLY_REPORT_READ_FAILED", "Failed to load task data.", 500);
  }
  const weeklyPlan = await prisma.weeklyProfessionPlan.findFirst({
    where: { userId, isActive: true },
    orderBy: { updatedAt: "desc" },
  });
  const total = tasks.length;
  const completed = tasks.filter((t) => t.status === "completed").length;
  const completionRate = total === 0 ? 0 : Number((completed / total).toFixed(2));

  return {
    weekKey: weeklyPlan?.weekKey || "N/A",
    completionRate,
    completed,
    total,
    riskLevel: completionRate < 0.5 ? "high" : completionRate < 0.8 ? "medium" : "low",
    suggestions: [
      "优先保证必做任务在上午完成。",
      "每天预留 30 分钟执行补救任务。",
      "周末进行一次完整复盘并调整下周职业。",
    ],
  };
}

async function upsertWeeklyReview(userId, payload = {}) {
  const weekKey = String(payload.weekKey || "").trim();
  const summary = String(payload.summary || "").trim();
  const strategy = String(payload.strategy || "").trim();
  if (!weekKey || !summary || !strategy) {
    throw new AppError("WEEKLY_REVIEW_INVALID", "weekKey, summary, strategy are required.", 400);
  }
  return prisma.weeklyReview.upsert({
    where: {
      userId_weekKey: {
        userId,
        weekKey,
      },
    },
    create: {
      id: `wr_${Date.now()}`,
      userId,
      weekKey,
      summary,
      strategy,
    },
    update: { summary, strategy },
  });
}

async function getWeeklyReview(userId, weekKey) {
  if (!weekKey) {
    throw new AppError("WEEK_KEY_REQUIRED", "weekKey is required.", 400);
  }
  return prisma.weeklyReview.findUnique({
    where: {
      userId_weekKey: {
        userId,
        weekKey,
      },
    },
  });
}

module.exports = {
  getWeeklyReport,
  upsertWeeklyReview,
  getWeeklyReview,
};
