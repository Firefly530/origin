const { prisma } = require("../../db/prisma");
const { AppError } = require("../../core/errors");
const { recordMainlineCompletionAfterTask } = require("../scheduler/dailySchedulerService");
const { tryGrantWeeklyCareerTiers } = require("../career/weeklyCareerService");
const { addMonthlyPromotionPointsForCompletedTask } = require("../career/careerProgressService");
const { evaluateSelfActivity } = require("../ai/aiEvaluationService");
const { llmOptionsFromBody } = require("../ai/llmClient");

async function getTodayTasks(userId) {
  const today = new Date().toISOString().slice(0, 10);
  const whereDay = { userId, taskDate: today };
  const [tasks, todayRowCount] = await Promise.all([
    prisma.dailyTask.findMany({
      where: {
        ...whereDay,
        status: "pending",
        sourceType: { not: "optional" },
      },
      orderBy: [{ sourceType: "asc" }, { createdAt: "asc" }],
    }),
    prisma.dailyTask.count({
      where: { ...whereDay, sourceType: { not: "optional" } },
    }),
  ]);
  return { tasks, todayRowCount };
}

async function createTask(userId, payload = {}) {
  const title = String(payload.title || "").trim();
  if (!title) {
    throw new AppError("TASK_TITLE_REQUIRED", "Task title is required.", 400);
  }
  const sourceType = payload.sourceType === "optional" ? "optional" : "mandatory";
  const taskDate = String(payload.taskDate || new Date().toISOString().slice(0, 10));
  const rewardCoin = Number(payload.rewardCoin || (sourceType === "mandatory" ? 120 : 60));
  let difficulty = Number(payload.difficulty);
  if (!Number.isFinite(difficulty)) difficulty = sourceType === "mandatory" ? 2 : 1;
  difficulty = Math.min(3, Math.max(1, Math.round(difficulty)));
  return prisma.dailyTask.create({
    data: {
      id: `t_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      userId,
      title,
      sourceType,
      status: "pending",
      rewardCoin,
      difficulty,
      taskDate,
      detailJson: "{}",
    },
  });
}

async function updateTask(userId, taskId, payload = {}) {
  const existing = await prisma.dailyTask.findUnique({ where: { id: taskId } });
  if (!existing || existing.userId !== userId) {
    throw new AppError("TASK_NOT_FOUND", "Task not found.", 404);
  }
  const data = {
    title: payload.title ? String(payload.title).trim() : existing.title,
    rewardCoin: payload.rewardCoin != null ? Number(payload.rewardCoin) : existing.rewardCoin,
    sourceType: payload.sourceType || existing.sourceType,
    taskDate: payload.taskDate || existing.taskDate,
  };
  if (payload.difficulty != null) {
    let d = Number(payload.difficulty);
    if (Number.isFinite(d)) {
      d = Math.min(3, Math.max(1, Math.round(d)));
      data.difficulty = d;
    }
  }
  return prisma.dailyTask.update({
    where: { id: taskId },
    data,
  });
}

async function deleteTask(userId, taskId) {
  const existing = await prisma.dailyTask.findUnique({ where: { id: taskId } });
  if (!existing || existing.userId !== userId) {
    throw new AppError("TASK_NOT_FOUND", "Task not found.", 404);
  }
  await prisma.dailyTask.delete({ where: { id: taskId } });
  return { deleted: true, id: taskId };
}

async function completeTask(userId, taskId, payload = {}) {
  const task = await prisma.dailyTask.findUnique({ where: { id: taskId } });
  if (!task || task.userId !== userId) {
    throw new AppError("TASK_NOT_FOUND", "Task not found.", 404);
  }
  if (task.status === "completed") {
    throw new AppError("TASK_ALREADY_COMPLETED", "Task already completed.", 409);
  }

  const qualityScore = Number(payload.qualityScore || 1);
  const reflection = payload.reflection || "";
  const reward = Math.round(task.rewardCoin * qualityScore);

  const { updatedTask, wallet } = await prisma.$transaction(async (tx) => {
    const taskRow = await tx.dailyTask.update({
      where: { id: taskId },
      data: {
        status: "completed",
        completedAt: new Date(),
        qualityScore,
        reflection,
      },
    });

    await tx.completionLog.create({
      data: {
        id: `log_${Date.now()}`,
        dailyTaskId: taskId,
        qualityScore,
        reflection,
      },
    });

    const walletRow = await tx.wallet.update({
      where: { userId },
      data: { coinBalance: { increment: reward } },
    });

    return { updatedTask: taskRow, wallet: walletRow };
  });

  await recordMainlineCompletionAfterTask(userId, updatedTask);

  const weeklyCareerBonus = await tryGrantWeeklyCareerTiers(userId);

  const plan = await prisma.weeklyProfessionPlan.findFirst({
    where: { userId, isActive: true },
    orderBy: { updatedAt: "desc" },
    select: { roleCode: true },
  });
  const roleCode = plan?.roleCode || "engineer";
  await addMonthlyPromotionPointsForCompletedTask(userId, roleCode, updatedTask);

  return {
    task: updatedTask,
    rewardCoin: reward,
    wallet,
    weeklyCareerBonus,
  };
}

/**
 * 用户自述完成事项：AI/启发式估难度，写入当日已完成任务并结算代币（约原「选做」折扣），计入日难度点进度。
 */
async function submitSelfActivity(userId, body = {}) {
  const raw = String(body.description || "").trim();
  if (raw.length < 8) {
    throw new AppError("DESCRIPTION_TOO_SHORT", "请至少用 8 个字描述你完成的事。", 400);
  }
  const taskDate = String(body.taskDate || new Date().toISOString().slice(0, 10));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(taskDate)) {
    throw new AppError("INVALID_TASK_DATE", "日期格式应为 YYYY-MM-DD。", 400);
  }

  const llm = llmOptionsFromBody(body);
  const apiKeyRaw = typeof body.apiKey === "string" ? body.apiKey.trim() : "";
  const evaluation = await evaluateSelfActivity({
    apiKey: apiKeyRaw || undefined,
    description: raw,
    provider: llm.provider,
    apiBaseUrl: llm.apiBaseUrl,
    model: llm.model,
  });

  const title = evaluation.displayTitle || (raw.length > 28 ? `${raw.slice(0, 26)}…` : raw);
  const difficulty = evaluation.difficulty;
  const rewardCoin = evaluation.suggestedRewardCoin;
  const qualityScore = 1;
  const reward = Math.round(rewardCoin * qualityScore);
  const taskId = `t_self_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  const logId = `log_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const detailJson = JSON.stringify({
    howTo: "",
    why: evaluation.rationaleOneLine || "",
    raw: raw.slice(0, 4000),
    source: evaluation.source || "unknown",
  });

  const { task, wallet } = await prisma.$transaction(async (tx) => {
    const taskRow = await tx.dailyTask.create({
      data: {
        id: taskId,
        userId,
        templateId: null,
        title,
        category: "habit",
        sourceType: "self_report",
        status: "completed",
        difficulty,
        isMainline: false,
        rewardCoin,
        taskDate,
        completedAt: new Date(),
        qualityScore,
        reflection: raw.slice(0, 2000),
        detailJson,
        targetsWeeklyDefects: false,
        defectTagsJson: "[]",
      },
    });

    await tx.completionLog.create({
      data: {
        id: logId,
        dailyTaskId: taskId,
        qualityScore,
        reflection: raw.slice(0, 2000),
      },
    });

    const walletRow = await tx.wallet.upsert({
      where: { userId },
      create: {
        userId,
        coinBalance: reward,
        energy: 100,
        reputation: 0,
      },
      update: { coinBalance: { increment: reward } },
    });

    return { task: taskRow, wallet: walletRow };
  });

  const weeklyCareerBonus = await tryGrantWeeklyCareerTiers(userId);

  return {
    task,
    rewardCoin: reward,
    wallet,
    weeklyCareerBonus,
    evaluation,
  };
}

module.exports = {
  getTodayTasks,
  createTask,
  updateTask,
  deleteTask,
  completeTask,
  submitSelfActivity,
};
