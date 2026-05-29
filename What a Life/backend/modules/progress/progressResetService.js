const { prisma } = require("../../db/prisma");
const { AppError } = require("../../core/errors");

/**
 * 清空任务、兑换、后果、代币与周进度等「局内进度」，保留账号、登录、日预算与职业周计划设置。
 */
async function resetUserGameProgress(userId) {
  const uid = String(userId || "").trim();
  if (!uid) {
    throw new AppError("USER_ID_REQUIRED", "缺少用户。", 400);
  }

  await prisma.$transaction(async (tx) => {
    await tx.recoveryPlan.deleteMany({ where: { userId: uid } });
    await tx.consequenceState.deleteMany({ where: { userId: uid } });
    await tx.dailyTask.deleteMany({ where: { userId: uid } });
    await tx.dailySelfReward.deleteMany({ where: { userId: uid } });
    await tx.petDebuff.deleteMany({ where: { userId: uid } });
    await tx.petInventory.deleteMany({ where: { userId: uid } });
    await tx.userPet.deleteMany({ where: { userId: uid } });
    await tx.redemptionRecord.deleteMany({ where: { userId: uid } });
    await tx.eventRecord.deleteMany({ where: { userId: uid } });
    await tx.userProfessionCareer.deleteMany({ where: { userId: uid } });
    await tx.attributeSnapshot.deleteMany({ where: { userId: uid } });
    await tx.syncEvent.deleteMany({ where: { userId: uid } });

    await tx.wallet.upsert({
      where: { userId: uid },
      create: { userId: uid, coinBalance: 0, energy: 100, reputation: 0 },
      update: { coinBalance: 0, energy: 100, reputation: 0 },
    });

    await tx.user.update({
      where: { id: uid },
      data: {
        milestoneCollectionJson: "[]",
        rewardCatalogPersonalizationJson: "{}",
        rewardBudgetPercentOverridesJson: "{}",
      },
    });

    await tx.weeklyProfessionPlan.updateMany({
      where: { userId: uid, isActive: true },
      data: {
        mainlinePhase: "intro",
        mainlineCompletionsWeek: 0,
        careerBonusClaimedJson: "{}",
      },
    });
  });

  return { ok: true };
}

module.exports = { resetUserGameProgress };
