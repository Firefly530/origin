const { prisma } = require("../../db/prisma");
const { resolveOppositeForIdentity } = require("./npcIdentityOpposite");
const { getMonthlyCareerSnapshot } = require("../career/careerProgressService");

function parseJsonStringArray(raw, fallback = []) {
  if (!raw || typeof raw !== "string") return [...fallback];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.map(String) : [...fallback];
  } catch {
    return [...fallback];
  }
}

async function buildRuntimeContextForNpc(userId, clientContext = {}) {
  const today = new Date().toISOString().slice(0, 10);
  const [user, plan, tasks] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        displayName: true,
        dailyBudgetCents: true,
        dailyWorkloadTarget: true,
        identityRoleCode: true,
      },
    }),
    prisma.weeklyProfessionPlan.findFirst({
      where: { userId, isActive: true },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.dailyTask.findMany({
      where: { userId, taskDate: today, sourceType: { not: "optional" } },
      select: { title: true, isMainline: true, difficulty: true, status: true, sourceType: true },
      orderBy: [{ sourceType: "asc" }, { createdAt: "asc" }],
    }),
  ]);

  let weeklyRoleDisplayName = null;
  if (plan?.roleCode) {
    const pr = await prisma.professionRole.findUnique({
      where: { code: plan.roleCode },
      select: { displayName: true },
    });
    weeklyRoleDisplayName = pr?.displayName || plan.roleCode;
  }

  const defectFocusTags = parseJsonStringArray(plan?.defectFocusTagsJson, []);
  const mainlineTasks = tasks.filter((t) => t.isMainline).map((t) => String(t.title || "").trim()).filter(Boolean);
  const todayTasksSummary = tasks.map((t) => ({
    title: t.title,
    isMainline: Boolean(t.isMainline),
    difficulty: t.difficulty,
    status: t.status,
  }));

  let userIdentityRoleCode = null;
  let userIdentityRoleDisplayName = null;
  let identityOppositeNpcPromptKey = null;
  let npcSpeakerLabelZh = null;

  const idCode = user?.identityRoleCode ? String(user.identityRoleCode).trim() : "";
  let monthlyCareerTitle = null;
  let monthlyCareerStageLabel = null;
  if (plan?.roleCode) {
    const snap = await getMonthlyCareerSnapshot(userId, plan.roleCode, user);
    if (snap) {
      monthlyCareerTitle = snap.title;
      monthlyCareerStageLabel = `${snap.careerStageLabel} · 第 ${snap.tierInStage} 档`;
    }
  }

  if (idCode) {
    const idPr = await prisma.professionRole.findUnique({
      where: { code: idCode },
      select: { displayName: true },
    });
    userIdentityRoleCode = idCode;
    userIdentityRoleDisplayName = idPr?.displayName || idCode;
    const opp = resolveOppositeForIdentity(idCode);
    if (opp) {
      identityOppositeNpcPromptKey = opp.npcPromptKey;
      npcSpeakerLabelZh = opp.speakerLabelZh;
    }
  }

  return {
    ...clientContext,
    userDisplayName: user?.displayName,
    dailyBudgetCents: user?.dailyBudgetCents,
    dailyWorkloadTarget: user?.dailyWorkloadTarget,
    weeklyRoleDisplayName,
    monthlyCareerTitle,
    monthlyCareerStageLabel,
    mainlinePhase: plan?.mainlinePhase,
    defectFocusTags,
    todayMainlineTaskTitles: mainlineTasks,
    todayTasksSummary,
    userIdentityRoleCode,
    userIdentityRoleDisplayName,
    identityOppositeNpcPromptKey,
    npcSpeakerLabelZh,
    npcBehaviorNote: identityOppositeNpcPromptKey
      ? "身份对调：你是向用户（现实身份见 userIdentityRoleDisplayName）求助的来访者。todayMainlineTaskTitles / todayTasksSummary 只应用来把你的困境说具体，禁止拿它们扮演专家给用户下指令或代替用户作专业结论。避免真实医疗/法律/财务诊断，仅生活化求助对话。"
      : "结合 todayMainlineTaskTitles 与 todayTasksSummary 里的措辞自然对谈。若存在 userIdentityRoleCode，你必须按对立身份第一人称扮演，不要用旁白体。避免医疗/法律/财务诊断，仅一般生活化交流。",
  };
}

module.exports = {
  buildRuntimeContextForNpc,
};
