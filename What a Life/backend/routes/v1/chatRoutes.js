const express = require("express");
const { chatWithNpc, listSessions, getSessionMessages } = require("../../modules/chat/chatService");
const { buildRuntimeContextForNpc } = require("../../modules/chat/npcContextService");
const { AppError } = require("../../core/errors");
const { asyncHandler } = require("../../middleware/asyncHandler");
const { llmOptionsFromBody } = require("../../modules/ai/llmClient");

const router = express.Router();

router.post("/npc", asyncHandler(async (req, res) => {
  const { role, messages, userContext } = req.body || {};
  const apiKey = typeof req.body?.apiKey === "string" ? req.body.apiKey.trim() : "";

  if (!apiKey) {
    throw new AppError("AI_KEY_MISSING", "Missing API key.", 400);
  }
  if (!role || typeof role !== "string") {
    throw new AppError("ROLE_MISSING", "Missing NPC role.", 400);
  }
  if (!Array.isArray(messages) || messages.length === 0) {
    throw new AppError("MESSAGES_EMPTY", "Messages cannot be empty.", 400);
  }

  const runtimeContext = await buildRuntimeContextForNpc(req.auth.userId, userContext || {});
  const llm = llmOptionsFromBody(req.body);

  const result = await chatWithNpc({
    userId: req.auth.userId,
    apiKey,
    role,
    messages: messages.slice(-20),
    runtimeContext,
    llm,
  });

  return res.json(result);
}));

router.get("/sessions", asyncHandler(async (req, res) => {
  const sessions = await listSessions(req.auth.userId);
  res.json({ sessions });
}));

router.get("/sessions/:sessionId/messages", asyncHandler(async (req, res) => {
  const data = await getSessionMessages(req.auth.userId, req.params.sessionId);
  res.json(data);
}));

module.exports = router;
