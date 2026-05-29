const { AppError } = require("../../core/errors");
const { chatCompletion } = require("./llmClient");

async function llmJsonCompletion({
  provider,
  apiKey,
  apiBaseUrl = "",
  model = "",
  system,
  userContent,
  temperature = 0.2,
}) {
  const { content, usage, usageNormalized } = await chatCompletion({
    provider,
    apiKey,
    apiBaseUrl,
    model,
    messages: [
      { role: "system", content: system },
      { role: "user", content: userContent },
    ],
    temperature,
    responseFormat: { type: "json_object" },
  });
  if (!content) {
    throw new AppError("AI_EMPTY_RESPONSE", "模型未返回内容。", 502);
  }
  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new AppError("AI_JSON_PARSE", "模型返回不是合法 JSON。", 502);
  }
  return { parsed, usage: usageNormalized ?? usage ?? null };
}

function heuristicTaskDifficulty(title) {
  const s = String(title || "").trim();
  const len = s.length;
  if (len >= 26) return 3;
  if (len >= 10) return 2;
  return 1;
}

function heuristicRewardCoin(difficulty) {
  return Math.round(60 + difficulty * 50);
}

function heuristicSelfActivityDifficulty(text) {
  const s = String(text || "").trim();
  const len = s.length;
  if (len >= 160) return 3;
  if (len >= 50) return 2;
  return 1;
}

/**
 * 用户自述「今天还做了什么」：估难度与短标题；无 key 时按篇幅启发式。
 */
async function evaluateSelfActivity({ apiKey, description, provider, apiBaseUrl, model }) {
  const text = String(description || "").trim();
  if (text.length < 8) {
    throw new AppError("DESCRIPTION_TOO_SHORT", "请至少用 8 个字描述你完成的事。", 400);
  }
  const key = typeof apiKey === "string" ? apiKey.trim() : "";
  if (!key) {
    const difficulty = heuristicSelfActivityDifficulty(text);
    const displayTitle =
      text.length > 28 ? `${text.slice(0, 26)}…` : text;
    return {
      difficulty,
      suggestedRewardCoin: Math.round(heuristicRewardCoin(difficulty) * 0.55),
      displayTitle,
      rationaleOneLine: "无 API Key：按描述篇幅启发式估难度，奖励为同级主线约 55%。",
      source: "heuristic",
    };
  }
  const { parsed, usage } = await llmJsonCompletion({
    provider,
    apiKey: key,
    apiBaseUrl: apiBaseUrl || "",
    model: model || "",
    system:
      "用户会写一段「今天实际做过的事」中文描述。你只输出 JSON：difficulty（1-3，考虑耗时、认知负荷、是否突破舒适区）、suggestedRewardCoin（35-140 的整数，偏低因为属补充记录）、displayTitle（≤26 字中文短标题，概括行为）、rationaleOneLine（≤60 字，说明为何是这个难度）。不要道德评判。",
    userContent: text.slice(0, 4000),
  });
  let difficulty = Number(parsed.difficulty);
  if (!Number.isFinite(difficulty)) difficulty = heuristicSelfActivityDifficulty(text);
  difficulty = Math.min(3, Math.max(1, Math.round(difficulty)));
  let suggestedRewardCoin = Number(parsed.suggestedRewardCoin);
  if (!Number.isFinite(suggestedRewardCoin)) {
    suggestedRewardCoin = Math.round(heuristicRewardCoin(difficulty) * 0.55);
  }
  suggestedRewardCoin = Math.min(140, Math.max(35, Math.round(suggestedRewardCoin)));
  let displayTitle = String(parsed.displayTitle || "").trim();
  if (!displayTitle) displayTitle = text.length > 26 ? `${text.slice(0, 24)}…` : text;
  if (displayTitle.length > 28) displayTitle = `${displayTitle.slice(0, 26)}…`;
  const rationaleOneLine = String(parsed.rationaleOneLine || "").trim().slice(0, 80);
  return {
    difficulty,
    suggestedRewardCoin,
    displayTitle,
    rationaleOneLine,
    source: "ai",
    tokenUsage: usage ?? null,
  };
}

/**
 * 用 AI 为单条任务标题估难度（1–3）；无 key 时回落启发式。
 */
async function evaluateTaskDifficulty({ apiKey, title, provider, apiBaseUrl, model }) {
  const t = String(title || "").trim();
  if (!t) {
    throw new AppError("TASK_TITLE_REQUIRED", "任务标题不能为空。", 400);
  }
  const key = typeof apiKey === "string" ? apiKey.trim() : "";
  if (!key) {
    const difficulty = heuristicTaskDifficulty(t);
    return {
      difficulty,
      suggestedRewardCoin: heuristicRewardCoin(difficulty),
      source: "heuristic",
    };
  }
  const { parsed, usage } = await llmJsonCompletion({
    provider,
    apiKey: key,
    apiBaseUrl: apiBaseUrl || "",
    model: model || "",
    system:
      "你是习惯教练。只输出 JSON 对象，键：difficulty（整数 1-3，1 最轻）、suggestedRewardCoin（整数 40-220）。难度按耗时、意志力与阻力估计。",
    userContent: `任务标题：${t}`,
  });
  let difficulty = Number(parsed.difficulty);
  if (!Number.isFinite(difficulty)) difficulty = heuristicTaskDifficulty(t);
  difficulty = Math.min(3, Math.max(1, Math.round(difficulty)));
  let suggestedRewardCoin = Number(parsed.suggestedRewardCoin);
  if (!Number.isFinite(suggestedRewardCoin)) {
    suggestedRewardCoin = heuristicRewardCoin(difficulty);
  }
  suggestedRewardCoin = Math.min(260, Math.max(40, Math.round(suggestedRewardCoin)));
  return { difficulty, suggestedRewardCoin, source: "ai", tokenUsage: usage };
}

function defaultBpsByTier(tier) {
  const t = String(tier || "").toUpperCase();
  if (t === "X") return 0;
  const map = { S: 800, A: 1600, B: 3200, C: 6000 };
  return map[t] ?? 1500;
}

/**
 * 按用户日预算为每条奖励估「占日可支配的万分比」；无 key 时按档位默认表。
 */
async function evaluateRewardBudgetPercents({
  apiKey,
  dailyBudgetCents,
  catalog,
  provider,
  apiBaseUrl,
  model,
}) {
  const budget = Math.max(100, Number(dailyBudgetCents) || 25000);
  const items = (catalog || []).map((r) => ({
    id: r.id,
    title: r.title,
    tier: r.tier,
  }));
  if (!items.length) {
    return { overrides: {}, source: "empty" };
  }
  if (!apiKey || typeof apiKey !== "string") {
    const overrides = {};
    for (const r of catalog) {
      const isX =
        String(r.tier || "").toUpperCase() === "X" ||
        String(r.rewardType || "").toLowerCase() === "milestone_memorial";
      overrides[r.id] = isX ? 0 : r.budgetPercentBps ?? defaultBpsByTier(r.tier);
    }
    return { overrides, source: "tier_defaults" };
  }
  const { parsed } = await llmJsonCompletion({
    provider,
    apiKey,
    apiBaseUrl: apiBaseUrl || "",
    model: model || "",
    system: `用户单日可支配预算为 ${budget} 分（人民币分）。你要为每条奖励分配 budgetPercentBps：占该日预算的万分比（10000=100%）。
表中 title 可能为槽位代号（如 TIER_SLOT_S），仅表示档位与 id 对应关系，请按 tier 语义估占比，勿把代号当作商品名。
规则：S 档小确幸约 5%-12%，A 约 10%-20%，B 约 20%-40%，C 约 35%-70%；**tier 为 X 的项为里程碑纪念礼，仅游戏代币兑换，不占现实日预算，budgetPercentBps 必须为 0**；其余项独立、可兑换多次时仍要合理。
只输出 JSON：{"items":[{"id":"...","budgetPercentBps":800}]}`,
    userContent: JSON.stringify({ dailyBudgetCents: budget, rewards: items }),
  });
  const arr = Array.isArray(parsed.items) ? parsed.items : [];
  const overrides = {};
  for (const row of arr) {
    const id = String(row.id || "").trim();
    let bps = Number(row.budgetPercentBps);
    if (!id || !Number.isFinite(bps)) continue;
    bps = Math.min(9500, Math.max(50, Math.round(bps)));
    overrides[id] = bps;
  }
  for (const r of catalog) {
    const isX =
      String(r.tier || "").toUpperCase() === "X" ||
      String(r.rewardType || "").toLowerCase() === "milestone_memorial";
    if (isX) {
      overrides[r.id] = 0;
    } else if (overrides[r.id] == null) {
      overrides[r.id] = r.budgetPercentBps ?? defaultBpsByTier(r.tier);
    }
  }
  return { overrides, source: "ai" };
}

/**
 * 按用户当前日可支配金额，重写每条奖励的标题、比例与代币，使项目语义与金额都合理。
 */
async function personalizeRewardCatalogWithLlm({ apiKey, dailyBudgetCents, catalog, llm }) {
  const cents = Math.max(100, Number(dailyBudgetCents) || 25000);
  const yuan = (cents / 100).toFixed(0);
  const lines = (catalog || []).map((r) => ({
    id: r.id,
    title: r.title,
    tier: r.tier,
    coinCost: r.coinCost,
    budgetPercentBps: r.budgetPercentBps,
  }));
  const system = `用户当前「日可支配」约为 **${yuan} 元**（人民币）。下表是商店里每条奖励的 id、**槽位代号**（形如 TIER_SLOT_S，仅表示档位，不是商品名）与档位 tier。

每条奖励的**中文名称必须由你生成**：不得沿用或翻译槽位代号；须结合 id 与 tier（S 高频小确幸、A/B/C 递增、X 里程碑纪念礼）与预算常识，给出具体可兑换的表述。商品名与实际金额的相符程度必须足够高，每次输出都应该进行校验，禁止出现不符合实际情况的金额。所有的奖励合理性校验都是基于实际金额而非可支出百分比。
1. **title**：中文，具体可执行。**S/A/B/C 档标题中一律禁止出现「××元」「几十元」等任何人民币具体标价**（现实金额由客户端用「日预算 × 占比」单独计算展示）；小额享受只用「一小杯」「一份」「加料一次」等量词。**X 档（里程碑纪念礼）** 用收藏、仪式、纪念感表述，同样**不要写人民币金额**；不占现实日预算。
2. **budgetPercentBps**：占该日预算的万分比（10000=100%）。**X 档必须填 0**（该档仅消耗代币，不扣减现实日预算）。
3. **coinCost**：整数代币成本，可与原值接近或略调，保持游戏内梯度合理。
4. **hint**：可选，一句说明为何这样设计。

只输出 JSON：{"items":[{"id":"reward_S_drink","title":"...","budgetPercentBps":800,"coinCost":180,"hint":"..."}]}`;

  const { content, usage, usageNormalized, modelUsed } = await chatCompletion({
    provider: llm.provider,
    apiKey,
    apiBaseUrl: llm.apiBaseUrl || "",
    model: llm.model || "",
    messages: [
      { role: "system", content: system },
      { role: "user", content: JSON.stringify({ dailyBudgetCents: cents, rewards: lines }) },
    ],
    temperature: 0.35,
    responseFormat: { type: "json_object" },
  });
  if (!content) {
    throw new AppError("AI_EMPTY_RESPONSE", "模型未返回内容。", 502);
  }
  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new AppError("AI_JSON_PARSE", "模型返回不是合法 JSON。", 502);
  }
  return { parsed, usage: usageNormalized ?? usage ?? null, modelUsed: modelUsed || null };
}

module.exports = {
  evaluateTaskDifficulty,
  evaluateSelfActivity,
  evaluateRewardBudgetPercents,
  personalizeRewardCatalogWithLlm,
  heuristicTaskDifficulty,
  heuristicRewardCoin,
  heuristicSelfActivityDifficulty,
  defaultBpsByTier,
};
