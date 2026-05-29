const { prisma } = require("../../db/prisma");
const { AppError } = require("../../core/errors");

function parseOverridesJson(raw) {
  try {
    const v = JSON.parse(raw || "{}");
    return v && typeof v === "object" ? v : {};
  } catch {
    return {};
  }
}

/** 与 weeklyCareerService 一致：UTC 周一为界的 ISO 周 7 个 YYYY-MM-DD */
function isoWeekDateStringsUtc(yyyyMmDd) {
  const parts = String(yyyyMmDd || "").trim().split("-");
  if (parts.length !== 3) return [];
  const y = Number(parts[0]);
  const mo = Number(parts[1]) - 1;
  const da = Number(parts[2]);
  if (![y, mo, da].every((n) => Number.isFinite(n))) return [];
  const utc = Date.UTC(y, mo, da);
  let dow = new Date(utc).getUTCDay();
  if (dow === 0) dow = 7;
  const mondayMs = utc - (dow - 1) * 86400000;
  const out = [];
  for (let i = 0; i < 7; i += 1) {
    out.push(new Date(mondayMs + i * 86400000).toISOString().slice(0, 10));
  }
  return out;
}

function isMilestoneMemorialReward(reward) {
  const t = String(reward?.tier || "").toUpperCase();
  const rt = String(reward?.rewardType || "").toLowerCase();
  return t === "X" || rt === "milestone_memorial";
}

function parseMilestoneCollectionJson(raw) {
  try {
    const v = JSON.parse(raw || "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function parseCatalogPersonalization(raw) {
  try {
    const v = JSON.parse(raw || "{}");
    if (!v || typeof v !== "object") return { atBudgetCents: null, items: {} };
    return {
      atBudgetCents: v.atBudgetCents != null ? Number(v.atBudgetCents) : null,
      items: v.items && typeof v.items === "object" ? v.items : {},
    };
  } catch {
    return { atBudgetCents: null, items: {} };
  }
}

function personalCoinCost(reward, user) {
  const pers = parseCatalogPersonalization(user?.rewardCatalogPersonalizationJson);
  const p = pers.items?.[reward.id];
  if (p?.coinCost != null && Number.isFinite(Number(p.coinCost))) {
    return Math.max(1, Math.round(Number(p.coinCost)));
  }
  return Number(reward.coinCost) || 0;
}

function isAiSlotCatalogTitle(title) {
  return /^TIER_SLOT_[SABCX]$/i.test(String(title || "").trim());
}

function displayTitleForReward(reward, user) {
  const pers = parseCatalogPersonalization(user?.rewardCatalogPersonalizationJson);
  const p = pers.items?.[reward.id];
  if (p?.title != null && String(p.title).trim()) return String(p.title).trim();
  if (isAiSlotCatalogTitle(reward.title)) {
    const t = String(reward.tier || "").toUpperCase() || "?";
    return `「${t}」档奖励（管理员可在种子目录中配置中文名）`;
  }
  return reward.title;
}

function resolveBpsForReward(rewardId, rewardRow, user) {
  if (isMilestoneMemorialReward(rewardRow)) return null;
  const pers = parseCatalogPersonalization(user?.rewardCatalogPersonalizationJson);
  const fromPers = pers.items?.[rewardId]?.budgetPercentBps;
  if (fromPers != null && Number.isFinite(Number(fromPers))) {
    const b = Math.round(Number(fromPers));
    if (b === 0) return 0;
    return Math.min(9500, Math.max(50, b));
  }
  const overrides = parseOverridesJson(user?.rewardBudgetPercentOverridesJson);
  const fromOverride = overrides[rewardId];
  if (fromOverride != null && Number.isFinite(Number(fromOverride))) {
    const b = Math.round(Number(fromOverride));
    if (b === 0) return 0;
    return Math.min(9500, Math.max(50, b));
  }
  const b = rewardRow.budgetPercentBps;
  if (b != null && Number.isFinite(Number(b))) return Math.round(Number(b));
  return null;
}

function resolveRedemptionBudgetCents(reward, user) {
  if (isMilestoneMemorialReward(reward)) return 0;
  const daily = Math.max(1, Number(user?.dailyBudgetCents) || 25000);
  const bps = resolveBpsForReward(reward.id, reward, user);
  if (bps != null && Number.isFinite(Number(bps))) {
    const n = Math.round((daily * Number(bps)) / 10000);
    if (n <= 0) return 0;
    return Math.max(1, n);
  }
  const fixed = Number(reward.budgetCostCents) || 0;
  return fixed > 0 ? Math.max(1, fixed) : 0;
}

async function getRewardCatalogForUser(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const rows = await prisma.rewardCatalog.findMany({ orderBy: { tier: "asc" } });
  const pers = parseCatalogPersonalization(user?.rewardCatalogPersonalizationJson);
  const budgetNow = user?.dailyBudgetCents != null ? Math.round(Number(user.dailyBudgetCents)) : null;
  const stale =
    pers.atBudgetCents != null &&
    budgetNow != null &&
    Math.round(Number(pers.atBudgetCents)) !== budgetNow;

  return rows.map((r) => {
    const appliedBps = resolveBpsForReward(r.id, r, user);
    const title = displayTitleForReward(r, user);
    const coinCost = personalCoinCost(r, user);
    const hint = pers.items?.[r.id]?.hint != null ? String(pers.items[r.id].hint).trim() : null;
    const milestoneOnlyCoins = isMilestoneMemorialReward(r);
    return {
      ...r,
      title,
      coinCost,
      effectiveBudgetCents: resolveRedemptionBudgetCents(r, user),
      appliedBudgetPercentBps: appliedBps != null && Number.isFinite(appliedBps) ? appliedBps : null,
      personalizationHint: hint || null,
      personalizationStale: stale,
      milestoneOnlyCoins,
      usesRealBudget: !milestoneOnlyCoins,
    };
  });
}

async function createReward(payload = {}) {
  const title = String(payload.title || "").trim();
  if (!title) {
    throw new AppError("REWARD_TITLE_REQUIRED", "Reward title is required.", 400);
  }
  return prisma.rewardCatalog.create({
    data: {
      id: `r_${Date.now()}`,
      title,
      tier: payload.tier || "S",
      coinCost: Number(payload.coinCost || 100),
      budgetCostCents: Number(payload.budgetCostCents || 1000),
      budgetPercentBps:
        payload.budgetPercentBps != null ? Number(payload.budgetPercentBps) : undefined,
      dailyLimit: Number(payload.dailyLimit || 1),
    },
  });
}

async function updateReward(rewardId, payload = {}) {
  const existing = await prisma.rewardCatalog.findUnique({ where: { id: rewardId } });
  if (!existing) {
    throw new AppError("REWARD_NOT_FOUND", "Reward not found.", 404);
  }
  return prisma.rewardCatalog.update({
    where: { id: rewardId },
    data: {
      title: payload.title ? String(payload.title).trim() : existing.title,
      tier: payload.tier || existing.tier,
      coinCost: payload.coinCost != null ? Number(payload.coinCost) : existing.coinCost,
      budgetCostCents:
        payload.budgetCostCents != null ? Number(payload.budgetCostCents) : existing.budgetCostCents,
      budgetPercentBps:
        payload.budgetPercentBps !== undefined
          ? payload.budgetPercentBps == null
            ? null
            : Number(payload.budgetPercentBps)
          : existing.budgetPercentBps,
      dailyLimit: payload.dailyLimit != null ? Number(payload.dailyLimit) : existing.dailyLimit,
    },
  });
}

async function deleteReward(rewardId) {
  const existing = await prisma.rewardCatalog.findUnique({ where: { id: rewardId } });
  if (!existing) {
    throw new AppError("REWARD_NOT_FOUND", "Reward not found.", 404);
  }
  const used = await prisma.redemptionRecord.count({ where: { rewardId } });
  if (used > 0) {
    throw new AppError("REWARD_IN_USE", "Reward has redemption records and cannot be deleted.", 409);
  }
  await prisma.rewardCatalog.delete({ where: { id: rewardId } });
  return { deleted: true, id: rewardId };
}

async function redeemReward(userId, rewardId) {
  const reward = await prisma.rewardCatalog.findUnique({ where: { id: rewardId } });
  if (!reward) {
    throw new AppError("REWARD_NOT_FOUND", "Reward not found.", 404);
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      dailyBudgetCents: true,
      rewardCatalogPersonalizationJson: true,
      rewardBudgetPercentOverridesJson: true,
      milestoneCollectionJson: true,
    },
  });
  const coinCost = personalCoinCost(reward, user);

  const wallet = await prisma.wallet.findUnique({ where: { userId } });
  if (!wallet || wallet.coinBalance < coinCost) {
    throw new AppError("INSUFFICIENT_COIN", "Not enough coin.", 400);
  }

  const today = new Date().toISOString().slice(0, 10);
  const todayRecords = await prisma.redemptionRecord.findMany({
    where: { userId, date: today },
  });
  const todayBudget = todayRecords.reduce((sum, r) => sum + r.budgetCostCents, 0);
  const dailyBudgetCents = user?.dailyBudgetCents || 25000;
  const budgetCostThisRedeem = resolveRedemptionBudgetCents(reward, user);

  if (todayBudget + budgetCostThisRedeem > dailyBudgetCents) {
    throw new AppError("BUDGET_GUARD_TRIGGERED", "Daily budget limit exceeded.", 400);
  }

  const sameRewardCount = todayRecords.filter((r) => r.rewardId === rewardId).length;
  const dailyCap = Number(reward.dailyLimit);
  if (dailyCap > 0 && sameRewardCount >= dailyCap) {
    throw new AppError("DAILY_REWARD_LIMIT", "Daily redemption limit reached.", 400);
  }

  const weeklyCap = Number(reward.weeklyLimit);
  if (weeklyCap > 0) {
    const weekDates = isoWeekDateStringsUtc(today);
    const weekCount = await prisma.redemptionRecord.count({
      where: { userId, rewardId, date: { in: weekDates } },
    });
    if (weekCount >= weeklyCap) {
      throw new AppError("WEEKLY_REWARD_LIMIT", "本周该奖励兑换次数已达上限。", 400);
    }
  }

  const redeemId = `redeem_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const displayTitle = displayTitleForReward(reward, user);
  const { record, updatedWallet, milestoneAdded } = await prisma.$transaction(async (tx) => {
    const recordRow = await tx.redemptionRecord.create({
      data: {
        id: redeemId,
        userId,
        rewardId: reward.id,
        coinSpent: coinCost,
        budgetCostCents: budgetCostThisRedeem,
        date: today,
      },
    });

    const walletRow = await tx.wallet.update({
      where: { userId },
      data: { coinBalance: { decrement: coinCost } },
    });

    let added = null;
    if (isMilestoneMemorialReward(reward)) {
      const coll = parseMilestoneCollectionJson(user?.milestoneCollectionJson);
      added = {
        rewardId: reward.id,
        title: displayTitle,
        redeemedAt: new Date().toISOString(),
        coinSpent: coinCost,
      };
      coll.push(added);
      await tx.user.update({
        where: { id: userId },
        data: { milestoneCollectionJson: JSON.stringify(coll) },
      });
    }

    return { record: recordRow, wallet: walletRow, milestoneAdded: added };
  });

  return {
    record,
    wallet: updatedWallet,
    todayBudgetCents: todayBudget + budgetCostThisRedeem,
    dailyBudgetCents,
    appliedBudgetCostCents: budgetCostThisRedeem,
    coinSpent: coinCost,
    milestoneAdded,
  };
}

module.exports = {
  getRewardCatalogForUser,
  createReward,
  updateReward,
  deleteReward,
  redeemReward,
  resolveRedemptionBudgetCents,
};
