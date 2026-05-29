const { AppError } = require("../../core/errors");

const NETWORK_HINT =
  "无法连接大模型服务。请检查网络、密钥与厂商控制台权限。若使用「自定义」端点，请填写以 https 开头且以 /v1 结尾的 OpenAI 兼容根路径（如 https://api.deepseek.com/v1）。";

/** @type {Record<string, { kind: string, defaultBase: () => string | null, defaultModel: string }>} */
const PROVIDERS = {
  openai: {
    kind: "openai_compatible",
    defaultBase: () => normalizeV1Base(process.env.OPENAI_BASE_URL || "https://api.openai.com/v1"),
    defaultModel: "gpt-4o-mini",
  },
  deepseek: {
    kind: "openai_compatible",
    defaultBase: () => normalizeV1Base(process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com/v1"),
    defaultModel: "deepseek-chat",
  },
  qwen: {
    kind: "openai_compatible",
    defaultBase: () => normalizeV1Base(process.env.QWEN_BASE_URL || "https://dashscope.aliyuncs.com/compatible-mode/v1"),
    defaultModel: process.env.QWEN_MODEL || "qwen3.6-plus",
  },
  moonshot: {
    kind: "openai_compatible",
    defaultBase: () => normalizeV1Base(process.env.MOONSHOT_BASE_URL || "https://api.moonshot.cn/v1"),
    defaultModel: "moonshot-v1-8k",
  },
  gemini: {
    kind: "gemini",
    defaultBase: () => null,
    defaultModel: process.env.GEMINI_MODEL || "gemini-1.5-flash",
  },
  custom: {
    kind: "openai_compatible",
    defaultBase: () => null,
    defaultModel: "gpt-4o-mini",
  },
};

function normalizeProviderId(raw) {
  /** 与前端默认「DeepSeek」一致，避免未传 llmProvider 时误走 OpenAI 导致密钥无效、控制台用量为 0 */
  const s = String(raw || "deepseek").toLowerCase().trim();
  return PROVIDERS[s] ? s : "deepseek";
}

function normalizeV1Base(href) {
  const fallback = "https://api.openai.com/v1";
  if (!href || typeof href !== "string") return fallback;
  let u = href.trim().replace(/\/+$/, "");
  if (!/^https:\/\//i.test(u)) return fallback;
  try {
    const url = new URL(u);
    let path = url.pathname.replace(/\/+$/, "") || "";
    if (!/\/v1$/i.test(path)) {
      path = `${path}/v1`.replace(/\/+/g, "/");
    }
    return `${url.origin}${path}`;
  } catch {
    return fallback;
  }
}

function isBlockedHostname(hostname) {
  const h = String(hostname || "").toLowerCase();
  if (!h) return true;
  if (h === "localhost" || h.endsWith(".localhost")) return true;
  if (h === "0.0.0.0") return true;
  const m = /^(\d+)\.(\d+)\.(\d+)\.(\d+)$/.exec(h);
  if (m) {
    const a = Number(m[1]);
    const b = Number(m[2]);
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 192 && b === 168) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 169 && b === 254) return true;
  }
  return false;
}

function assertSafeHttpsApiBase(urlStr) {
  if (!urlStr || typeof urlStr !== "string") {
    throw new AppError("AI_BAD_URL", "请填写自定义 API 根路径（https 开头，程序会自动补上 /v1）。", 400);
  }
  let u;
  try {
    u = new URL(urlStr.trim());
  } catch {
    throw new AppError("AI_BAD_URL", "自定义 API 地址不是合法 URL。", 400);
  }
  if (u.protocol !== "https:") {
    throw new AppError("AI_BAD_URL", "自定义端点仅支持 https。", 400);
  }
  if (isBlockedHostname(u.hostname)) {
    throw new AppError("AI_BAD_URL", "不允许使用本地或私网地址作为自定义端点。", 400);
  }
}

function resolveOpenAiCompatibleBase(providerId, apiBaseUrl) {
  const preset = PROVIDERS[providerId];
  if (providerId === "custom") {
    assertSafeHttpsApiBase(apiBaseUrl);
    return normalizeV1Base(apiBaseUrl);
  }
  const trimmed = typeof apiBaseUrl === "string" ? apiBaseUrl.trim() : "";
  if (trimmed) {
    assertSafeHttpsApiBase(trimmed);
    return normalizeV1Base(trimmed);
  }
  return preset.defaultBase();
}

function openAiCompatibleChatUrl(base) {
  const b = String(base).replace(/\/+$/, "");
  return b.endsWith("/chat/completions") ? b : `${b}/chat/completions`;
}

async function fetchJson(url, { method = "POST", headers = {}, body } = {}) {
  let response;
  try {
    response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json", ...headers },
      body: body != null ? JSON.stringify(body) : undefined,
    });
  } catch (e) {
    const detail = e && e.message ? String(e.message) : "fetch failed";
    throw new AppError("AI_NETWORK_ERROR", `${NETWORK_HINT}（底层错误：${detail}）`, 502);
  }
  let data;
  try {
    data = await response.json();
  } catch {
    throw new AppError("AI_BAD_RESPONSE", "模型服务返回了非 JSON 内容。", response.status || 502);
  }
  if (!response.ok) {
    const msg =
      data?.error?.message ||
      data?.message ||
      (typeof data?.error === "string" ? data.error : null) ||
      `模型请求失败（HTTP ${response.status}）。`;
    throw new AppError("AI_PROVIDER_ERROR", msg, response.status >= 400 && response.status < 600 ? response.status : 502);
  }
  return data;
}

/**
 * 将各厂商返回的用量字段统一为 { promptTokens, completionTokens, totalTokens }，便于前端展示与排查。
 * OpenAI 兼容：usage.prompt_tokens / completion_tokens / total_tokens
 * Gemini：usageMetadata.promptTokenCount / candidatesTokenCount / totalTokenCount
 */
function normalizeModelTokenUsage(data) {
  if (!data || typeof data !== "object") return null;
  const u = data.usage;
  if (u && typeof u === "object") {
    const pt = u.prompt_tokens ?? u.promptTokens;
    const ct = u.completion_tokens ?? u.completionTokens;
    const tt = u.total_tokens ?? u.totalTokens;
    if ([pt, ct, tt].some((x) => x != null && Number.isFinite(Number(x)))) {
      const p = Math.max(0, Math.round(Number(pt) || 0));
      const c = Math.max(0, Math.round(Number(ct) || 0));
      const tot =
        tt != null && Number.isFinite(Number(tt)) ? Math.max(0, Math.round(Number(tt))) : p + c;
      return { promptTokens: p, completionTokens: c, totalTokens: tot, raw: u };
    }
  }
  const meta = data.usageMetadata;
  if (meta && typeof meta === "object") {
    const p = Math.max(0, Math.round(Number(meta.promptTokenCount) || 0));
    const c = Math.max(0, Math.round(Number(meta.candidatesTokenCount) || 0));
    const tot =
      meta.totalTokenCount != null && Number.isFinite(Number(meta.totalTokenCount))
        ? Math.max(0, Math.round(Number(meta.totalTokenCount)))
        : p + c;
    return { promptTokens: p, completionTokens: c, totalTokens: tot, raw: meta };
  }
  return null;
}

function openAiMessagesToGemini(messages) {
  const sysParts = [];
  const contents = [];
  for (const m of messages || []) {
    const role = m.role;
    const text = String(m.content ?? "");
    if (role === "system") {
      sysParts.push(text);
      continue;
    }
    if (role === "user") {
      contents.push({ role: "user", parts: [{ text }] });
    } else if (role === "assistant") {
      contents.push({ role: "model", parts: [{ text }] });
    }
  }
  const systemInstruction =
    sysParts.length > 0 ? { parts: [{ text: sysParts.join("\n\n") }] } : undefined;
  return { systemInstruction, contents };
}

async function geminiGenerateContent({ apiKey, model, messages, temperature, jsonMode }) {
  const { systemInstruction, contents } = openAiMessagesToGemini(messages);
  if (!contents.length) {
    throw new AppError("AI_BAD_REQUEST", "Gemini 至少需要一条用户消息。", 400);
  }
  const url = new URL(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
  );
  url.searchParams.set("key", apiKey);
  const body = {
    contents,
    generationConfig: {
      temperature: temperature ?? 0.7,
      ...(jsonMode ? { responseMimeType: "application/json" } : {}),
    },
  };
  if (systemInstruction) body.systemInstruction = systemInstruction;

  const data = await fetchJson(url.toString(), { body });
  const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") || "";
  if (!text) {
    const block = data?.promptFeedback?.blockReason;
    throw new AppError(
      "AI_EMPTY_RESPONSE",
      block ? `Gemini 未返回内容（可能被拦截：${block}）。` : "Gemini 未返回内容。",
      502,
    );
  }
  const usageNormalized = normalizeModelTokenUsage(data);
  return {
    content: text,
    raw: data,
    modelUsed: model,
    usage: data?.usageMetadata,
    usageNormalized,
  };
}

/**
 * OpenAI 风格多轮对话补全。
 * @param {object} opts
 * @returns {Promise<{ content: string, usage?: object, raw?: object }>}
 */
async function chatCompletion(opts) {
  const {
    provider: providerRaw,
    apiKey,
    apiBaseUrl,
    model: modelRaw,
    messages,
    temperature = 0.7,
    responseFormat,
  } = opts;
  const keyTrim = typeof apiKey === "string" ? apiKey.trim() : "";
  if (!keyTrim) {
    throw new AppError("AI_KEY_MISSING", "缺少 API 密钥。", 400);
  }
  const provider = normalizeProviderId(providerRaw);
  const preset = PROVIDERS[provider];
  const model = (typeof modelRaw === "string" && modelRaw.trim()) || preset.defaultModel;

  if (preset.kind === "gemini") {
    return geminiGenerateContent({
      apiKey: keyTrim,
      model,
      messages,
      temperature,
      jsonMode: responseFormat?.type === "json_object",
    });
  }

  const base = resolveOpenAiCompatibleBase(provider, apiBaseUrl);
  const url = openAiCompatibleChatUrl(base);
  const body = {
    model,
    messages,
    temperature,
    stream: false,
  };
  if (responseFormat?.type === "json_object") {
    body.response_format = responseFormat;
  }
  const data = await fetchJson(url, {
    headers: { Authorization: `Bearer ${keyTrim}` },
    body,
  });
  const content = data?.choices?.[0]?.message?.content;
  if (!content) {
    throw new AppError("AI_EMPTY_RESPONSE", "模型未返回文本内容。", 502);
  }
  const usageNormalized = normalizeModelTokenUsage(data);
  return {
    content,
    usage: data?.usage,
    usageNormalized,
    raw: data,
    modelUsed: model,
  };
}

function llmOptionsFromBody(body = {}) {
  const b = body && typeof body === "object" ? body : {};
  return {
    provider: normalizeProviderId(b.llmProvider || b.provider),
    apiBaseUrl: typeof b.apiBaseUrl === "string" ? b.apiBaseUrl.trim() : "",
    model: typeof b.model === "string" ? b.model.trim() : "",
  };
}

module.exports = {
  chatCompletion,
  llmOptionsFromBody,
  normalizeProviderId,
  normalizeModelTokenUsage,
  normalizeV1Base,
  PROVIDERS,
  NETWORK_HINT,
};
