const express = require("express");
const {
  getTodayTasks,
  createTask,
  updateTask,
  deleteTask,
  completeTask,
  submitSelfActivity,
} = require("../../modules/task/taskService");
const { generateTodayTasksIfNeeded } = require("../../modules/scheduler/dailySchedulerService");
const { enqueueSyncEvent } = require("../../modules/sync/syncService");
const { asyncHandler } = require("../../middleware/asyncHandler");
const { evaluateTaskDifficulty } = require("../../modules/ai/aiEvaluationService");
const { AppError } = require("../../core/errors");
const { llmOptionsFromBody } = require("../../modules/ai/llmClient");

const router = express.Router();

router.get("/today", asyncHandler(async (req, res) => {
  const { tasks, todayRowCount } = await getTodayTasks(req.auth.userId);
  res.json({ tasks, todayRowCount });
}));

router.post("/self-activity", asyncHandler(async (req, res) => {
  const result = await submitSelfActivity(req.auth.userId, req.body || {});
  await enqueueSyncEvent(req.auth.userId, "daily_tasks", result.task.id, "insert", result.task);
  res.status(201).json(result);
}));

router.post("/evaluate-difficulty", asyncHandler(async (req, res) => {
  const title = String(req.body?.title || "").trim();
  if (!title) {
    throw new AppError("TASK_TITLE_REQUIRED", "请填写任务标题。", 400);
  }
  const apiKeyRaw = typeof req.body?.apiKey === "string" ? req.body.apiKey.trim() : "";
  const llm = llmOptionsFromBody(req.body);
  const result = await evaluateTaskDifficulty({
    apiKey: apiKeyRaw || undefined,
    title,
    provider: llm.provider,
    apiBaseUrl: llm.apiBaseUrl,
    model: llm.model,
  });
  res.json(result);
}));

router.post("/today/generate", asyncHandler(async (req, res) => {
  const result = await generateTodayTasksIfNeeded({
    userId: req.auth.userId,
    force: Boolean(req.body?.force),
    fullRefresh: Boolean(req.body?.fullRefresh),
    taskDate: req.body?.taskDate ? String(req.body.taskDate) : undefined,
  });
  res.json(result);
}));

router.post("/", asyncHandler(async (req, res) => {
  const task = await createTask(req.auth.userId, req.body || {});
  await enqueueSyncEvent(req.auth.userId, "daily_tasks", task.id, "insert", task);
  res.status(201).json({ task });
}));

router.patch("/:id", asyncHandler(async (req, res) => {
  const task = await updateTask(req.auth.userId, req.params.id, req.body || {});
  await enqueueSyncEvent(req.auth.userId, "daily_tasks", task.id, "update", task);
  res.json({ task });
}));

router.delete("/:id", asyncHandler(async (req, res) => {
  const result = await deleteTask(req.auth.userId, req.params.id);
  await enqueueSyncEvent(req.auth.userId, "daily_tasks", req.params.id, "delete", result);
  res.json(result);
}));

router.post("/:id/complete", asyncHandler(async (req, res) => {
  const result = await completeTask(req.auth.userId, req.params.id, req.body || {});
  await enqueueSyncEvent(req.auth.userId, "daily_tasks", req.params.id, "update", { status: "completed" });
  return res.json(result);
}));

module.exports = router;
