const { prisma } = require("../../db/prisma");
const { AppError } = require("../../core/errors");
const { coinCostForBudgetShareBps } = require("./budgetShareCoinMap");

function normalizeLogDate(raw) {
  const s = String(raw || "").trim().slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  return new Date().toISOString().slice(0, 10);
}

function parseAmountCents(body) {
  if (body.amountCents != null && Number.isFinite(Number(body.amountCents))) {
    return Math.max(1, Math.round(Number(body.amountCents)));
  }
  const yuan = Number(body.amountYuan);
  if (Number.isFinite(yuan) && yuan > 0) {
    return Math.max(1, Math.round(yuan * 100));
  }
  return NaN;
}

async function listSelfRewards(userId, logDate) {
  const date = normalizeLogDate(logDate);
  const rows = await prisma.dailySelfReward.findMany({
    where: { userId, logDate: date },
    orderBy: { createdAt: "asc" },
  });
  return { logDate: date, rewards: rows };
}

async function recordSelfReward(userId, body = {}) {
  const title = String(body.title || "").trim().slice(0, 200);
  if (!title) {
    throw new AppError("SELF_REWARD_TITLE_REQUIRED", "请填写奖励说明。", 400);
  }
  const amountCents = parseAmountCents(body);
  if (!Number.isFinite(amountCents) || amountCents < 1) {
    throw new AppError("SELF_REWARD_AMOUNT_INVALID", "请填写有效的金额（元或分）。", 400);
  }
  const logDate = normalizeLogDate(body.logDate);
  const note = String(body.note || "").trim().slice(0, 500);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { dailyBudgetCents: true },
  });
  const dailyBudgetCents = Math.max(100, Number(user?.dailyBudgetCents) || 25000);

  const existing = await prisma.dailySelfReward.findMany({
    where: { userId, logDate },
    select: { amountCents: true },
  });
  const spentSoFar = existing.reduce((s, r) => s + (Number(r.amountCents) || 0), 0);
  if (spentSoFar + amountCents > dailyBudgetCents) {
    throw new AppError(
      "SELF_REWARD_BUDGET_EXCEEDED",
      `今日已记录奖励金额合计将超过日可支配预算（¥${(dailyBudgetCents / 100).toFixed(2)}）。`,
      400,
    );
  }

  const budgetPercentBps = Math.min(10000, Math.max(1, Math.round((10000 * amountCents) / dailyBudgetCents)));
  const coinSpent = coinCostForBudgetShareBps(budgetPercentBps);

  const wallet = await prisma.wallet.findUnique({ where: { userId } });
  if (!wallet || wallet.coinBalance < coinSpent) {
    throw new AppError("INSUFFICIENT_COIN", "代币不足，无法记录该笔奖励。", 400);
  }

  const id = `sr_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

  const row = await prisma.$transaction(async (tx) => {
    const created = await tx.dailySelfReward.create({
      data: {
        id,
        userId,
        logDate,
        title,
        amountCents,
        budgetPercentBps,
        coinSpent,
        note,
      },
    });
    await tx.wallet.update({
      where: { userId },
      data: { coinBalance: { decrement: coinSpent } },
    });
    return created;
  });

  const w = await prisma.wallet.findUnique({ where: { userId } });
  return { reward: row, wallet: w, dailyBudgetCents };
}

async function deleteSelfReward(userId, rewardId) {
  const id = String(rewardId || "").trim();
  const row = await prisma.dailySelfReward.findFirst({
    where: { id, userId },
  });
  if (!row) {
    throw new AppError("SELF_REWARD_NOT_FOUND", "记录不存在。", 404);
  }
  await prisma.$transaction(async (tx) => {
    await tx.dailySelfReward.delete({ where: { id } });
    await tx.wallet.update({
      where: { userId },
      data: { coinBalance: { increment: row.coinSpent } },
    });
  });
  const wallet = await prisma.wallet.findUnique({ where: { userId } });
  return { deleted: true, id, refundedCoins: row.coinSpent, wallet };
}

module.exports = {
  listSelfRewards,
  recordSelfReward,
  deleteSelfReward,
  normalizeLogDate,
};
