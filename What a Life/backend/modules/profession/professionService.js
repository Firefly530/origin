const { prisma } = require("../../db/prisma");
const { AppError } = require("../../core/errors");
const { getIsoWeekKey } = require("../scheduler/dailySchedulerService");

async function getRoles() {
  return prisma.professionRole.findMany({ orderBy: { code: "asc" } });
}

async function getWeeklyPlan(userId) {
  return prisma.weeklyProfessionPlan.findFirst({
    where: { userId, isActive: true },
    orderBy: { updatedAt: "desc" },
  });
}

/**
 * @param {string} userId
 * @param {string | { role: string, weekKey?: string, defectFocusTags?: string[] }} payload
 * @param {string} [weekKeyArg]
 */
async function setWeeklyPlan(userId, payload, weekKeyArg) {
  let role;
  let weekKeyInput;
  let defectFocusTags;

  if (typeof payload === "string" || payload == null) {
    role = payload;
    weekKeyInput = weekKeyArg;
  } else {
    role = payload.role;
    weekKeyInput = payload.weekKey;
    defectFocusTags = payload.defectFocusTags;
  }

  const exists = await prisma.professionRole.findUnique({ where: { code: role } });
  if (!role || !exists) {
    throw new AppError("ROLE_NOT_FOUND", "Role not found.", 404);
  }

  const current = await getWeeklyPlan(userId);
  const nextWeekKey = weekKeyInput || current?.weekKey || getIsoWeekKey();
  const weekChanged = Boolean(current && current.weekKey !== nextWeekKey);

  let changedCount = 0;
  if (current && !weekChanged) {
    changedCount = current.changedCount ?? 0;
    if (current.roleCode !== role) {
      changedCount += 1;
    }
  }

  let defectFocusTagsJson =
    current?.defectFocusTagsJson || JSON.stringify(["拖延", "分心"]);
  if (Array.isArray(defectFocusTags) && defectFocusTags.length > 0) {
    const normalized = defectFocusTags
      .slice(0, 2)
      .map((t) => String(t).trim())
      .filter(Boolean);
    if (normalized.length > 0) {
      defectFocusTagsJson = JSON.stringify(normalized);
    }
  }

  const id = current?.id || `wp_${userId}_${Date.now()}`;
  const plan = await prisma.weeklyProfessionPlan.upsert({
    where: { id },
    create: {
      id,
      userId,
      weekKey: nextWeekKey,
      roleCode: role,
      changedCount,
      isActive: true,
      mainlinePhase: "intro",
      mainlineCompletionsWeek: 0,
      defectFocusTagsJson,
    },
    update: {
      weekKey: nextWeekKey,
      roleCode: role,
      changedCount,
      defectFocusTagsJson,
      ...(weekChanged
        ? { mainlineCompletionsWeek: 0, mainlinePhase: "intro", careerBonusClaimedJson: "{}" }
        : {}),
    },
  });

  await prisma.user.update({
    where: { id: userId },
    data: { identityRoleCode: role },
  });

  return plan;
}

module.exports = {
  getRoles,
  getWeeklyPlan,
  setWeeklyPlan,
};
