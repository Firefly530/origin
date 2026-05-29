const { prisma } = require("../../db/prisma");
const { chatCompletion } = require("../ai/llmClient");
const { getDayLog } = require("./dayLogService");
const { getMonthlyCareerSnapshot } = require("../career/careerProgressService");

function dayUtcRange(logDate) {
  const start = new Date(`${logDate}T00:00:00.000Z`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
}

async function summarizeDayForUser(userId, apiKey, logDate, llm = {}) {
  const { logDate: date, entries } = await getDayLog(userId, logDate);
  const { start, end } = dayUtcRange(date);

  const [user, plan, messages] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        displayName: true,
        identityRoleCode: true,
        dailyBudgetCents: true,
        dailyWorkloadTarget: true,
      },
    }),
    prisma.weeklyProfessionPlan.findFirst({
      where: { userId, isActive: true },
      orderBy: { updatedAt: "desc" },
      include: { role: { select: { displayName: true } } },
    }),
    prisma.chatMessage.findMany({
      where: {
        createdAt: { gte: start, lt: end },
        session: { userId },
      },
      orderBy: { createdAt: "asc" },
      take: 120,
      include: {
        session: { select: { roleCode: true } },
      },
    }),
  ]);

  let identityLabel = "";
  if (user?.identityRoleCode) {
    const pr = await prisma.professionRole.findUnique({
      where: { code: String(user.identityRoleCode) },
      select: { displayName: true },
    });
    identityLabel = pr?.displayName || user.identityRoleCode;
  }

  const weeklyRole = plan?.role?.displayName || plan?.roleCode || "未设置周职业";
  const mainlinePhase = plan?.mainlinePhase || "intro";
  let monthlyCareerBrief = "";
  if (plan?.roleCode) {
    const snap = await getMonthlyCareerSnapshot(userId, plan.roleCode, user);
    if (snap) {
      monthlyCareerBrief = `${snap.title} · ${snap.careerStageLabel} · 本月复杂分 ${snap.monthPromotionPoints}/${snap.promotionThreshold}`;
    }
  }

  const taskLines = entries
    .filter((e) => e.kind === "task_completed")
    .map((e) => {
      const tag = e.isMainline ? "主线" : e.sourceType === "optional" ? "支线" : "必做";
      return `- [${tag}] ${e.title}（难度 ${e.difficulty ?? "—"}，+${e.rewardCoinEarned}🪙）`;
    });

  const rewardLines = entries
    .filter((e) => e.kind === "self_reward")
    .map((e) => {
      const yuan = (e.amountCents / 100).toFixed(2);
      const pct = (e.budgetPercentBps / 100).toFixed(1);
      return `- ${e.title}：¥${yuan}（约占日预算 ${pct}%），扣 ${e.coinSpent}🪙${e.note ? ` · ${e.note}` : ""}`;
    });

  const clipMessage = (m) => {
    const role = String(m.session?.roleCode || "").trim();
    const body = String(m.content || "").slice(0, 500);
    return role ? `[${role}] ${body}` : body;
  };
  const userChatLines = messages.filter((m) => m.messageRole === "user").map(clipMessage);
  const npcChatLines = messages.filter((m) => m.messageRole === "assistant").map(clipMessage);

  const payload = {
    日期: date,
    用户显示名: user?.displayName,
    现实身份标签: identityLabel || "（未单独设置，可与周职业相同）",
    本周职业语境: weeklyRole,
    主线阶段: mainlinePhase,
    本月职称进度: monthlyCareerBrief || "（无周职业或未初始化）",
    日可支配预算元: ((user?.dailyBudgetCents || 25000) / 100).toFixed(2),
    当日目标工作量点: user?.dailyWorkloadTarget ?? 12,
    日志条目: entries,
    已完成任务摘要: taskLines.length ? taskLines.join("\n") : "（无）",
    自我奖励记录: rewardLines.length ? rewardLines.join("\n") : "（无）",
    用户发言摘录: userChatLines.length ? userChatLines.join("\n") : "（无）",
    NPC对话摘录_剧情语境非用户事实:
      npcChatLines.length ? npcChatLines.join("\n") : "（无）",
  };

  const system = `你是温和、具体的成长教练。用户已授权你根据结构化「一天数据」做简短总结（约 300～500 字中文）。
要求：
1. 尊重用户自称的身份/职业标签（若有），语气自然、不教条。
2. 分别点到：主线/必做/支线完成情况（若有）、现实奖励与自控（若有）、用户发言里体现的情绪或主题（若有）。
3. 给出 1～2 条可执行的明日小建议，避免空泛口号。
4. 不要编造未出现在数据里的具体事实；没有数据的板块可一句带过。
5. **归因规则（必须遵守）**：健康、身体、情绪、经历等「发生在用户身上」的陈述，只能依据「用户发言摘录」、任务完成与奖励日志；**不得**把「NPC对话摘录」中的台词、假设或角色扮演内容写成用户的真实情况。若 NPC 提到不适/低落等而用户未在同日发言中自述，总结里不要写「用户身体不适」之类；最多可写「对话里 NPC 曾提及…（属角色对话，非用户自述）」，通常直接省略更稳妥。`;

  const userContent = JSON.stringify(payload, null, 2);

  const { content, usage, usageNormalized, modelUsed } = await chatCompletion({
    provider: llm.provider,
    apiKey,
    apiBaseUrl: llm.apiBaseUrl || "",
    model: llm.model || "",
    messages: [
      { role: "system", content: system },
      { role: "user", content: userContent },
    ],
    temperature: 0.55,
  });

  return {
    logDate: date,
    summary: content.trim(),
    llm: { modelUsed, usage: usageNormalized ?? usage ?? null },
  };
}

module.exports = { summarizeDayForUser };
