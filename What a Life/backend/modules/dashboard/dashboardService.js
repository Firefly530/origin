const { prisma } = require("../../db/prisma");
const { getWeeklyCareerSnapshot } = require("../career/weeklyCareerService");
const { getMonthlyCareerSnapshot } = require("../career/careerProgressService");

function sumDifficulty(tasks, predicate) {
  return tasks
    .filter((t) => t.sourceType !== "optional")
    .filter(predicate)
    .reduce((acc, t) => acc + (Number(t.difficulty) || 1), 0);
}

async function getSummary(userId) {
  const [user, wallet, todayTasks, weeklyPlan, activeConsequences] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.wallet.findUnique({ where: { userId } }),
    prisma.dailyTask.findMany({
      where: { userId, taskDate: new Date().toISOString().slice(0, 10) },
    }),
    prisma.weeklyProfessionPlan.findFirst({
      where: { userId, isActive: true },
      orderBy: { updatedAt: "desc" },
      include: { role: true },
    }),
    prisma.consequenceState.count({ where: { userId, active: true } }),
  ]);

  const completedToday = todayTasks.filter(
    (t) => t.status === "completed" && t.sourceType !== "optional",
  ).length;
  const workloadTarget = Math.max(6, Math.min(22, Number(user?.dailyWorkloadTarget) || 12));
  const scheduledDifficulty = sumDifficulty(todayTasks, () => true);
  const completedDifficulty = sumDifficulty(todayTasks, (t) => t.status === "completed");

  let weeklyRoleDisplayName = null;
  if (weeklyPlan?.roleCode) {
    const pr = weeklyPlan.role || (await prisma.professionRole.findUnique({
      where: { code: weeklyPlan.roleCode },
      select: { displayName: true },
    }));
    weeklyRoleDisplayName = pr?.displayName || weeklyPlan.roleCode;
  }

  const weeklyCareer = await getWeeklyCareerSnapshot(userId, user, weeklyPlan);
  const monthlyCareer =
    weeklyPlan?.roleCode != null
      ? await getMonthlyCareerSnapshot(userId, weeklyPlan.roleCode, user)
      : null;

  let milestoneCollection = [];
  try {
    const v = JSON.parse(user?.milestoneCollectionJson || "[]");
    milestoneCollection = Array.isArray(v) ? v : [];
  } catch {
    milestoneCollection = [];
  }

  return {
    user: {
      id: user?.id,
      displayName: user?.displayName,
      dailyBudgetCents: user?.dailyBudgetCents || 25000,
      dailyWorkloadTarget: workloadTarget,
      onboardingStep: user?.onboardingStep || "done",
      identityRoleCode: user?.identityRoleCode || null,
    },
    wallet: {
      coinBalance: wallet?.coinBalance || 0,
      energy: wallet?.energy || 0,
      reputation: wallet?.reputation || 0,
    },
    today: {
      totalTasks: todayTasks.filter((t) => t.sourceType !== "optional").length,
      completedTasks: completedToday,
      workloadTarget,
      scheduledDifficulty,
      completedDifficulty,
    },
    weeklyPlan,
    weeklyRoleDisplayName,
    weeklyCareer,
    monthlyCareer,
    milestoneCollection,
    activeConsequenceCount: activeConsequences,
  };
}

module.exports = { getSummary };
