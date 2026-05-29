const fs = require("fs");
const path = require("path");
const { prisma } = require("../../db/prisma");
const { AppError } = require("../../core/errors");
const { chatCompletion } = require("../ai/llmClient");

const OPPOSITE_PROMPT_PATH = path.join(__dirname, "../../../prompts/npc_identity_opposite.md");

function loadNpcPrompt() {
  const promptPath = path.join(__dirname, "../../../prompts/npc_descriptions.md");
  return fs.readFileSync(promptPath, "utf8");
}

function loadOppositePrompt() {
  try {
    return fs.readFileSync(OPPOSITE_PROMPT_PATH, "utf8");
  } catch {
    return "";
  }
}

function escapeRegExp(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractMarkdownSection(markdown, sectionName) {
  if (!markdown || !sectionName) return "";
  const lines = String(markdown).split(/\r?\n/);
  const startRe = new RegExp(`^##\\s+${escapeRegExp(sectionName)}\\s*$`, "i");
  let start = -1;
  for (let i = 0; i < lines.length; i += 1) {
    if (startRe.test(lines[i].trim())) {
      start = i + 1;
      break;
    }
  }
  if (start === -1) return "";
  const out = [];
  for (let i = start; i < lines.length; i += 1) {
    if (/^##\s+/.test(lines[i])) break;
    out.push(lines[i]);
  }
  return out.join("\n").trim();
}

function buildSystemPrompt(roleFromUi, runtimeContext = {}) {
  const main = loadNpcPrompt();
  const oppKey = runtimeContext.identityOppositeNpcPromptKey;
  const speaker = runtimeContext.npcSpeakerLabelZh;
  const userIdLabel = runtimeContext.userIdentityRoleDisplayName || runtimeContext.userIdentityRoleCode;

  if (oppKey && speaker && userIdLabel) {
    const oppositeMd = loadOppositePrompt();
    const oppositeBody = extractMarkdownSection(oppositeMd, oppKey) || extractMarkdownSection(main, roleFromUi);
    const oppositeCommon = extractMarkdownSection(oppositeMd, "opposite_common");
    const guard = `【身份对调·必须遵守】
用户在现实中扮演「${userIdLabel}」——**专业人士 / 被求助的一方**（对话里 role 为 user 的文本即其发言）。
你必须扮演「${speaker}」——**基于该职业场景、前来向用户求助 / 求教的一方**；你不是用户本人，也不是用户的代言人。

人称与职责：
- 你的第一人称「我」**仅指**来访者本人；**禁止**用「我」复述或冒充用户的专业判断、诊断结论、技术定案或用户才该有的经历。
- **禁止代替用户发言**：不要替用户总结其未说过的态度，不要替用户下指令、定方案；可提问、示弱、补充你的处境，把专业回应与定论的空间留给用户。
- 用「您」「老师」等敬称称呼对方（视「${userIdLabel}」语境自然选择），不要用旁白体描写双方。
- 禁止自称「旁白」、禁止用第三人称指代你自己。

界面所选对话预设「${roleFromUi}」仅作语气与话题参考；你的主身份仍是「向「${userIdLabel}」请教的${speaker}」。\n\n`;
    const ctxJson = JSON.stringify({
      ...runtimeContext,
      identityOppositeNpcPromptKey: undefined,
      npcSpeakerLabelZh: undefined,
    });
    const tail = oppositeCommon
      ? `${oppositeCommon}\n\nRuntime context: ${ctxJson}`
      : `Runtime context: ${ctxJson}`;
    return `${guard}${oppositeBody}\n\n## 对谈语境（来访者视角）\n${tail}`;
  }

  const roleBody = extractMarkdownSection(main, roleFromUi);
  const common = extractMarkdownSection(main, "common behavior");
  if (roleBody) {
    return `${roleBody}\n\n## common behavior\n${common}\n\nCurrent selected role: ${roleFromUi}\nRuntime context: ${JSON.stringify(runtimeContext)}`;
  }
  return `${main}\n\nCurrent selected role: ${roleFromUi}\nRuntime context: ${JSON.stringify(runtimeContext)}`;
}

function sessionIdFor(userId, role) {
  return `sess_${userId}_${role}`;
}

async function chatWithNpc({ userId, apiKey, role, messages, runtimeContext, llm = {} }) {
  const systemPrompt = buildSystemPrompt(role, runtimeContext);
  const fullMessages = [{ role: "system", content: systemPrompt }, ...messages];

  const started = Date.now();
  const { content, usage, usageNormalized, modelUsed } = await chatCompletion({
    provider: llm.provider,
    apiKey,
    apiBaseUrl: llm.apiBaseUrl || "",
    model: llm.model || "",
    messages: fullMessages,
    temperature: 0.7,
  });
  const latencyMs = Date.now() - started;

  if (!content) {
    throw new AppError("AI_EMPTY_RESPONSE", "Empty response from model.", 502);
  }

  const sessionId = sessionIdFor(userId, role);
  await prisma.chatSession.upsert({
    where: { id: sessionId },
    create: {
      id: sessionId,
      userId,
      roleCode: role,
    },
    update: { roleCode: role },
  });

  const latestUserMessage = [...messages].reverse().find((m) => m.role === "user");
  if (latestUserMessage) {
    await prisma.chatMessage.create({
      data: {
        id: `msg_u_${Date.now()}`,
        sessionId,
        messageRole: "user",
        content: latestUserMessage.content,
        latencyMs: 0,
      },
    });
  }
  await prisma.chatMessage.create({
    data: {
      id: `msg_a_${Date.now()}`,
      sessionId,
      messageRole: "assistant",
      content,
      latencyMs,
    },
  });

  return {
    reply: content,
    npcSpeakerLabelZh: runtimeContext?.npcSpeakerLabelZh || null,
    identityOppositeMode: Boolean(runtimeContext?.identityOppositeNpcPromptKey),
    provider: llm.provider,
    model: modelUsed,
    latencyMs,
    tokenUsage: usageNormalized ?? usage ?? null,
  };
}

async function listSessions(userId) {
  return prisma.chatSession.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      roleCode: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { messages: true } },
    },
  });
}

async function getSessionMessages(userId, sessionId) {
  if (!sessionId) {
    throw new AppError("SESSION_ID_REQUIRED", "sessionId is required.", 400);
  }
  const session = await prisma.chatSession.findUnique({ where: { id: sessionId } });
  if (!session || session.userId !== userId) {
    throw new AppError("SESSION_NOT_FOUND", "Session not found.", 404);
  }
  const messages = await prisma.chatMessage.findMany({
    where: { sessionId },
    orderBy: { createdAt: "asc" },
  });
  return { session, messages };
}

module.exports = {
  chatWithNpc,
  listSessions,
  getSessionMessages,
};
