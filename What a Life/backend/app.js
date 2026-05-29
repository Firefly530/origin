const express = require("express");
const path = require("path");
const v1Routes = require("./routes/v1");
const { chatWithNpc } = require("./modules/chat/chatService");
const { USER_ID } = require("./db/initData");
const { AppError } = require("./core/errors");
const { asyncHandler } = require("./middleware/asyncHandler");
const { errorHandler } = require("./middleware/errorHandler");
const { requestContext } = require("./middleware/requestContext");
const { requestLogger } = require("./middleware/requestLogger");
const { llmOptionsFromBody } = require("./modules/ai/llmClient");

const app = express();

app.use(express.json({ limit: "1mb" }));
app.use(requestContext);
app.use(requestLogger);
app.use(express.static(path.join(__dirname, "../public")));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/v1", v1Routes);

// Backward-compatible endpoint for existing frontend call.
app.post("/api/chat", asyncHandler(async (req, res) => {
  const { role, messages } = req.body || {};
  const apiKey = typeof req.body?.apiKey === "string" ? req.body.apiKey.trim() : "";
  if (!apiKey || !role || !Array.isArray(messages) || messages.length === 0) {
    throw new AppError("INVALID_PAYLOAD", "Invalid payload.", 400);
  }
  const llm = llmOptionsFromBody(req.body);
  const result = await chatWithNpc({
    userId: USER_ID,
    apiKey,
    role,
    messages: messages.slice(-20),
    runtimeContext: {},
    llm,
  });
  return res.json({ reply: result.reply });
}));

app.use(errorHandler);

module.exports = { app };
