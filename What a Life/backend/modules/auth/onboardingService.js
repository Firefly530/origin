const { prisma } = require("../../db/prisma");
const { AppError } = require("../../core/errors");
const { createTask } = require("../task/taskService");
const { evaluateTaskDifficulty } = require("../ai/aiEvaluationService");
const { normalizeProviderId } = require("../ai/llmClient");

/**
 * 首次引导：日预算、工作量目标、自选今日任务（可选 AI 估难度）。
 */
async function completeOnboarding(userId, payload = {}) {
  const dailyBudgetCentsRaw = payload.dailyBudgetCents ?? payload.dailyBudgetYuan;
  let dailyBudgetCents = Number(dailyBudgetCentsRaw);
  if (payload.dailyBudgetYuan != null && payload.dailyBudgetCents == null) {
    dailyBudgetCents = Math.round(Number(payload.dailyBudgetYuan) * 100);
  }
  if (!Number.isFinite(dailyBudgetCents) || dailyBudgetCents < 100) {
    dailyBudgetCents = 25000;
  }
  dailyBudgetCents = Math.min(5000000, Math.max(100, Math.round(dailyBudgetCents)));

  let dailyWorkloadTarget = Number(payload.dailyWorkloadTarget);
  if (!Number.isFinite(dailyWorkloadTarget)) dailyWorkloadTarget = 12;
  dailyWorkloadTarget = Math.min(22, Math.max(6, Math.round(dailyWorkloadTarget)));

  const rawTitles = Array.isArray(payload.initialTaskTitles)
    ? payload.initialTaskTitles
    : typeof payload.initialTaskTitles === "string"
      ? payload.initialTaskTitles.split(/\n+/).map((s) => s.trim()).filter(Boolean)
      : [];
  const titles = rawTitles.map((t) => String(t || "").trim()).filter(Boolean).slice(0, 5);

  const apiKey = typeof payload.apiKey === "string" ? payload.apiKey.trim() : "";
  const llm = {
    provider: normalizeProviderId(payload.llmProvider || payload.provider || "deepseek"),
    apiBaseUrl: typeof payload.apiBaseUrl === "string" ? payload.apiBaseUrl.trim() : "",
    model: typeof payload.model === "string" ? payload.model.trim() : "",
  };

  await prisma.user.update({
    where: { id: userId },
    data: {
      dailyBudgetCents,
      dailyWorkloadTarget,
      onboardingStep: "done",
    },
  });

  await prisma.budgetGuard.updateMany({
    where: { userId },
    data: { dailyBudgetCents },
  });

  const taskDate = new Date().toISOString().slice(0, 10);
  const created = [];
  for (const title of titles) {
    const ev = await evaluateTaskDifficulty({
      apiKey: apiKey || undefined,
      title,
      provider: llm.provider,
      apiBaseUrl: llm.apiBaseUrl,
      model: llm.model,
    });
    const task = await createTask(userId, {
      title,
      sourceType: "mandatory",
      difficulty: ev.difficulty,
      rewardCoin: ev.suggestedRewardCoin,
      taskDate,
    });
    created.push(task);
  }

  return {
    user: await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        dailyBudgetCents: true,
        dailyWorkloadTarget: true,
        onboardingStep: true,
      },
    }),
    initialTasksCreated: created.length,
  };
}

async function updatePlayerProfile(userId, payload = {}) {
  const existing = await prisma.user.findUnique({ where: { id: userId } });
  if (!existing) {
    throw new AppError("USER_NOT_FOUND", "用户不存在。", 404);
  }
  const data = {};
  if (payload.dailyBudgetCents != null) {
    let v = Number(payload.dailyBudgetCents);
    if (Number.isFinite(v)) {
      v = Math.min(5000000, Math.max(100, Math.round(v)));
      data.dailyBudgetCents = v;
    }
  }
  if (payload.dailyBudgetYuan != null && data.dailyBudgetCents == null) {
    const y = Number(payload.dailyBudgetYuan);
    if (Number.isFinite(y)) {
      data.dailyBudgetCents = Math.min(5000000, Math.max(100, Math.round(y * 100)));
    }
  }
  if (payload.dailyWorkloadTarget != null) {
    let w = Number(payload.dailyWorkloadTarget);
    if (Number.isFinite(w)) {
      w = Math.min(22, Math.max(6, Math.round(w)));
      data.dailyWorkloadTarget = w;
    }
  }
  if (payload.identityRoleCode !== undefined) {
    const raw = payload.identityRoleCode == null ? "" : String(payload.identityRoleCode).trim();
    data.identityRoleCode = raw ? raw : null;
  }
  if (Object.keys(data).length === 0) {
    return prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        loginUsername: true,
        displayName: true,
        accountRole: true,
        dailyBudgetCents: true,
        dailyWorkloadTarget: true,
        onboardingStep: true,
        identityRoleCode: true,
      },
    });
  }
  await prisma.user.update({ where: { id: userId }, data });
  if (data.dailyBudgetCents != null) {
    await prisma.budgetGuard.updateMany({
      where: { userId },
      data: { dailyBudgetCents: data.dailyBudgetCents },
    });
  }
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      loginUsername: true,
      displayName: true,
      accountRole: true,
      dailyBudgetCents: true,
      dailyWorkloadTarget: true,
      onboardingStep: true,
      identityRoleCode: true,
    },
  });
}

module.exports = {
  completeOnboarding,
  updatePlayerProfile,
};
