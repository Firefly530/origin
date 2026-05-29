const express = require("express");
const { getDayLog } = require("../../modules/log/dayLogService");
const { summarizeDayForUser } = require("../../modules/log/daySummaryService");
const { asyncHandler } = require("../../middleware/asyncHandler");
const { AppError } = require("../../core/errors");
const { llmOptionsFromBody } = require("../../modules/ai/llmClient");

const router = express.Router();

router.get("/day", asyncHandler(async (req, res) => {
  const logDate = req.query?.date ? String(req.query.date) : undefined;
  const data = await getDayLog(req.auth.userId, logDate);
  res.json(data);
}));

router.post("/summarize-day", asyncHandler(async (req, res) => {
  const apiKey = typeof req.body?.apiKey === "string" ? req.body.apiKey.trim() : "";
  if (!apiKey) {
    throw new AppError("AI_KEY_MISSING", "缺少 API 密钥。", 400);
  }
  const logDate = req.body?.logDate ? String(req.body.logDate) : undefined;
  const result = await summarizeDayForUser(req.auth.userId, apiKey, logDate, llmOptionsFromBody(req.body));
  res.json(result);
}));

module.exports = router;
