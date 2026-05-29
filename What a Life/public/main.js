const apiKeyInput = document.getElementById("apiKey");
const roleSelect = document.getElementById("role");
const saveKeyBtn = document.getElementById("saveKeyBtn");
const logoutBtn = document.getElementById("logoutBtn");
const whoamiEl = document.getElementById("whoami");
const authGate = document.getElementById("authGate");
const mainApp = document.getElementById("mainApp");
const authFeedback = document.getElementById("authFeedback");
const authModeTitle = document.getElementById("authModeTitle");
const loginPanel = document.getElementById("loginPanel");
const registerPanel = document.getElementById("registerPanel");
const showRegisterBtn = document.getElementById("showRegisterBtn");
const showLoginBtn = document.getElementById("showLoginBtn");
const loginBtn = document.getElementById("loginBtn");
const loginUsernameInput = document.getElementById("loginUsername");
const loginPasswordInput = document.getElementById("loginPassword");
const regUsername = document.getElementById("regUsername");
const regDisplayName = document.getElementById("regDisplayName");
const regPassword = document.getElementById("regPassword");
const regPassword2 = document.getElementById("regPassword2");
const registerBtn = document.getElementById("registerBtn");
const sendBtn = document.getElementById("sendBtn");
const clearBtn = document.getElementById("clearBtn");
const refreshAllBtn = document.getElementById("refreshAllBtn");
const refreshAllStatus = document.getElementById("refreshAllStatus");
const evalConsequenceBtn = document.getElementById("evalConsequenceBtn");
const input = document.getElementById("input");
const chat = document.getElementById("chat");
const errorEl = document.getElementById("error");
const tasksData = document.getElementById("tasksData");
const taskDetailDialog = document.getElementById("taskDetailDialog");
const taskDetailTitle = document.getElementById("taskDetailTitle");
const taskDetailMeta = document.getElementById("taskDetailMeta");
const taskDetailBody = document.getElementById("taskDetailBody");
const selfActivityDesc = document.getElementById("selfActivityDesc");
const submitSelfActivityBtn = document.getElementById("submitSelfActivityBtn");
const selfActivityHint = document.getElementById("selfActivityHint");
const rewardsData = document.getElementById("rewardsData");
const professionData = document.getElementById("professionData");
const consequenceData = document.getElementById("consequenceData");
const reportData = document.getElementById("reportData");
const syncData = document.getElementById("syncData");
const weeklyRole = document.getElementById("weeklyRole");
const weekKeyInput = document.getElementById("weekKey");
const defectTag1 = document.getElementById("defectTag1");
const defectTag2 = document.getElementById("defectTag2");
const saveWeeklyRoleBtn = document.getElementById("saveWeeklyRoleBtn");
const newTaskTitle = document.getElementById("newTaskTitle");
const newTaskSourceType = document.getElementById("newTaskSourceType");
const newTaskReward = document.getElementById("newTaskReward");
const addTaskBtn = document.getElementById("addTaskBtn");
const newRewardTitle = document.getElementById("newRewardTitle");
const newRewardTier = document.getElementById("newRewardTier");
const newRewardCoinCost = document.getElementById("newRewardCoinCost");
const newRewardBudgetCost = document.getElementById("newRewardBudgetCost");
const addRewardBtn = document.getElementById("addRewardBtn");
const reviewWeekKey = document.getElementById("reviewWeekKey");
const reviewSummary = document.getElementById("reviewSummary");
const reviewStrategy = document.getElementById("reviewStrategy");
const saveReviewBtn = document.getElementById("saveReviewBtn");
const queryReviewWeekKey = document.getElementById("queryReviewWeekKey");
const loadReviewBtn = document.getElementById("loadReviewBtn");
const reviewRecordData = document.getElementById("reviewRecordData");
const loadSessionsBtn = document.getElementById("loadSessionsBtn");
const sessionsData = document.getElementById("sessionsData");
const adminUsersData = document.getElementById("adminUsersData");
const newUserLogin = document.getElementById("newUserLogin");
const newUserDisplay = document.getElementById("newUserDisplay");
const newUserRole = document.getElementById("newUserRole");
const newUserPassword = document.getElementById("newUserPassword");
const createUserBtn = document.getElementById("createUserBtn");
const adminNotice = document.getElementById("adminNotice");

const hudCoins = document.getElementById("hudCoins");
const hudTasks = document.getElementById("hudTasks");
const hudRole = document.getElementById("hudRole");
const hudPhase = document.getElementById("hudPhase");
const hudBudget = document.getElementById("hudBudget");
const hudCons = document.getElementById("hudCons");

const STORAGE_KEY = "growth_game_api_key";
const STORAGE_LLM_PROVIDER = "growth_game_llm_provider";
const STORAGE_LLM_CUSTOM_BASE = "growth_game_llm_custom_base";
const STORAGE_LLM_MODEL = "growth_game_llm_model";
const AUTH_TOKEN_KEY = "growth_game_auth_token";

let conversation = [];
/** @type {"root"|"player"|"developer"|""} */
let currentRole = "";
/** @type {object | null} */
let lastDashboard = null;
/** @type {Record<string, object>} */
const lastTodayTasksById = {};

const workloadBarWrap = document.getElementById("workloadBarWrap");
const workloadBarInner = document.getElementById("workloadBarInner");
const workloadBarMeta = document.getElementById("workloadBarMeta");
const playerWorkloadInput = document.getElementById("playerWorkloadInput");
const saveWorkloadBtn = document.getElementById("saveWorkloadBtn");
const playerDailyYuan = document.getElementById("playerDailyYuan");
const saveDailyBudgetBtn = document.getElementById("saveDailyBudgetBtn");
const selfRewardTitle = document.getElementById("selfRewardTitle");
const selfRewardAmountYuan = document.getElementById("selfRewardAmountYuan");
const selfRewardNote = document.getElementById("selfRewardNote");
const addSelfRewardBtn = document.getElementById("addSelfRewardBtn");
const selfRewardsList = document.getElementById("selfRewardsList");
const selfRewardHint = document.getElementById("selfRewardHint");
const dayLogDateInput = document.getElementById("dayLogDateInput");
const refreshDayLogBtn = document.getElementById("refreshDayLogBtn");
const summarizeDayBtn = document.getElementById("summarizeDayBtn");
const dayLogBody = document.getElementById("dayLogBody");
const daySummaryOut = document.getElementById("daySummaryOut");
const resetProgressBtn = document.getElementById("resetProgressBtn");
const resetProgressConfirm = document.getElementById("resetProgressConfirm");
const refreshTodayTasksBtn = document.getElementById("refreshTodayTasksBtn");
const professionSaveHint = document.getElementById("professionSaveHint");
const petPanel = document.getElementById("petPanel");
const weeklyCareerBody = document.getElementById("weeklyCareerBody");
const onboardingOverlay = document.getElementById("onboardingOverlay");
const onboardDailyYuan = document.getElementById("onboardDailyYuan");
const onboardWorkload = document.getElementById("onboardWorkload");
const onboardTasks = document.getElementById("onboardTasks");
const onboardApiKey = document.getElementById("onboardApiKey");
const onboardingSubmitBtn = document.getElementById("onboardingSubmitBtn");
const onboardingErr = document.getElementById("onboardingErr");
const regDailyYuan = document.getElementById("regDailyYuan");
const keySaveStatus = document.getElementById("keySaveStatus");
const aiProvider = document.getElementById("aiProvider");
const aiCustomBase = document.getElementById("aiCustomBase");
const aiModel = document.getElementById("aiModel");

const PHASE_LABEL = { intro: "入门", execution: "执行", expert: "冲刺" };

const TASK_STATUS_ZH = { pending: "待完成", completed: "已完成" };

const RISK_LEVEL_ZH = { high: "高", medium: "中", low: "低" };

const CONSEQUENCE_TYPE_ZH = {
  missed_daily_mandatory: "今日必做未全部完成时触发的规则",
};

const CONSEQUENCE_EFFECT_ZH = {
  tomorrow_recovery_task: "明天会优先安排「补救类」任务，帮助你回到正轨",
};

function formatConsequenceLine(c) {
  const head = CONSEQUENCE_TYPE_ZH[c.type] || `规则：${c.type}`;
  const tail = CONSEQUENCE_EFFECT_ZH[c.effect] || `说明：${c.effect}`;
  return `${head} → ${tail}`;
}

function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function parseDefectFocus(jsonStr) {
  try {
    const v = JSON.parse(jsonStr || "[]");
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
}

function authHeaders(extra = {}) {
  const t = localStorage.getItem(AUTH_TOKEN_KEY);
  const h = { ...extra };
  if (t) h.Authorization = `Bearer ${t}`;
  return h;
}

function setAuthFeedback(message, type = "err") {
  if (!authFeedback) return;
  if (!message) {
    authFeedback.style.display = "none";
    authFeedback.textContent = "";
    authFeedback.className = "auth-feedback";
    return;
  }
  authFeedback.textContent = message;
  authFeedback.className = `auth-feedback ${type === "ok" ? "ok" : "err"}`;
  authFeedback.style.display = "block";
}

function setAdminNotice(message, type = "ok") {
  if (!adminNotice) return;
  if (!message) {
    adminNotice.style.display = "none";
    adminNotice.textContent = "";
    adminNotice.className = "admin-notice";
    return;
  }
  adminNotice.textContent = message;
  adminNotice.className = `admin-notice ${type === "ok" ? "ok" : "err"}`;
  adminNotice.style.display = "block";
}

function showLoginMode() {
  if (loginPanel) loginPanel.style.display = "";
  if (registerPanel) registerPanel.style.display = "none";
  if (authModeTitle) authModeTitle.textContent = "登录后开启你的成长局";
  setAuthFeedback("");
}

function showRegisterMode() {
  if (loginPanel) loginPanel.style.display = "none";
  if (registerPanel) registerPanel.style.display = "";
  if (authModeTitle) authModeTitle.textContent = "注册新账号";
  setAuthFeedback("");
}

function handleAuthExpired() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  currentRole = "";
  document.body.classList.remove("role-player", "role-developer", "role-root");
  if (mainApp) mainApp.style.display = "none";
  if (authGate) authGate.style.display = "flex";
  if (onboardingOverlay) onboardingOverlay.style.display = "none";
  showLoginMode();
  setAuthFeedback("");
}

function applyRoleToBody(role) {
  document.body.classList.remove("role-player", "role-developer", "role-root");
  if (role === "player" || role === "developer" || role === "root") {
    document.body.classList.add(`role-${role}`);
  }
}

function showAuthGate() {
  handleAuthExpired();
}

async function parseJsonResponse(resp) {
  const text = await resp.text();
  try {
    return JSON.parse(text);
  } catch {
    return { message: text || "请求失败" };
  }
}

async function apiGet(url) {
  const resp = await fetch(url, { headers: authHeaders() });
  const data = await parseJsonResponse(resp);
  if (resp.status === 401) {
    handleAuthExpired();
    throw new Error(data.message || "请重新登录");
  }
  if (!resp.ok) throw new Error(data.message || data.error || "请求失败");
  return data;
}

async function apiPost(url, payload) {
  const resp = await fetch(url, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload || {}),
  });
  const data = await parseJsonResponse(resp);
  if (resp.status === 401) {
    handleAuthExpired();
    throw new Error(data.message || "请重新登录");
  }
  if (!resp.ok) throw new Error(data.message || data.error || "请求失败");
  return data;
}

async function apiPatch(url, payload) {
  const resp = await fetch(url, {
    method: "PATCH",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload || {}),
  });
  const data = await parseJsonResponse(resp);
  if (resp.status === 401) {
    handleAuthExpired();
    throw new Error(data.message || "请重新登录");
  }
  if (!resp.ok) throw new Error(data.message || data.error || "请求失败");
  return data;
}

async function apiDelete(url) {
  const resp = await fetch(url, { method: "DELETE", headers: authHeaders() });
  const data = await parseJsonResponse(resp);
  if (resp.status === 401) {
    handleAuthExpired();
    throw new Error(data.message || "请重新登录");
  }
  if (!resp.ok) throw new Error(data.message || data.error || "请求失败");
  return data;
}

async function publicPost(url, payload) {
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload || {}),
  });
  const data = await parseJsonResponse(resp);
  if (!resp.ok) {
    let msg = data.message || data.error || "请求失败";
    if (data.details && typeof data.details === "object") {
      const parts = Object.values(data.details).filter((v) => typeof v === "string" && v.trim());
      if (parts.length) msg = parts.join(" ");
    }
    throw new Error(msg);
  }
  return data;
}

async function authLogin(loginUsername, password) {
  return publicPost("/api/v1/auth/login", { loginUsername, password });
}

function setError(message = "") {
  errorEl.textContent = message;
  errorEl.style.display = message ? "block" : "none";
}

function setKeySaveStatus(message = "", type = "") {
  if (!keySaveStatus) return;
  keySaveStatus.textContent = message || "";
  keySaveStatus.className = "key-save-status" + (type ? ` ${type}` : "");
}

function syncAiCustomBaseVisibility() {
  if (!aiCustomBase || !aiProvider) return;
  const custom = aiProvider.value === "custom";
  aiCustomBase.style.display = custom ? "" : "none";
}

/** 与后端 llmOptionsFromBody 对齐 */
function getLlmRequestBody() {
  const provider = aiProvider?.value || "deepseek";
  const body = { llmProvider: provider };
  if (provider === "custom") {
    const b = (aiCustomBase?.value || "").trim();
    if (b) body.apiBaseUrl = b;
  }
  const m = (aiModel?.value || "").trim();
  if (m) body.model = m;
  return body;
}

function parseTaskDetailJson(task) {
  try {
    const o = JSON.parse(task?.detailJson || "{}");
    return o && typeof o === "object" ? o : {};
  } catch {
    return {};
  }
}

function tierClass(tier) {
  const t = String(tier || "").toLowerCase();
  return `tier-${t}`;
}

function fillRoleSelects(roles) {
  if (!roles || roles.length === 0) return;
  const opts = roles
    .map((r) => `<option value="${escapeHtml(r.code)}">${escapeHtml(r.displayName)}</option>`)
    .join("");
  if (roleSelect) roleSelect.innerHTML = opts;
  if (weeklyRole) weeklyRole.innerHTML = opts;
}

function adminRoleSelectHtml(u) {
  if (u.accountRole === "root") {
    return `<span class="small">管理员</span>`;
  }
  const p = u.accountRole === "player";
  const d = u.accountRole === "developer";
  return `<select class="admin-sel-role" aria-label="角色">
    <option value="player" ${p ? "selected" : ""}>玩家</option>
    <option value="developer" ${d ? "selected" : ""}>开发人员</option>
  </select>`;
}

async function refreshAdminUsers() {
  if (!adminUsersData || currentRole !== "root") return;
  const data = await apiGet("/api/v1/admin/users");
  const rows = (data.users || [])
    .map((u) => {
      const rid = escapeHtml(u.id);
      const canEdit = u.accountRole !== "root";
      return `<div class="admin-user-row" data-user-id="${rid}">
        <div>
          <strong>${escapeHtml(u.loginUsername || "—")}</strong>
          <div class="small" style="opacity:0.85">${escapeHtml(u.id)}</div>
        </div>
        <input type="text" class="admin-inp-display" value="${escapeHtml(u.displayName || "")}" aria-label="显示名" />
        ${adminRoleSelectHtml(u)}
        <button type="button" class="btn btn-ghost admin-btn-save">保存</button>
        ${
          canEdit
            ? `<button type="button" class="btn btn-danger admin-btn-del">删除</button>`
            : `<span class="small">—</span>`
        }
      </div>`;
    })
    .join("");
  adminUsersData.innerHTML = rows || "暂无用户";
}

function bindAdminUsersDelegation() {
  if (!adminUsersData || adminUsersData.dataset.delegationBound === "1") return;
  adminUsersData.dataset.delegationBound = "1";
  adminUsersData.addEventListener("click", async (e) => {
    const row = e.target.closest(".admin-user-row");
    if (!row) return;
    const userId = row.getAttribute("data-user-id");
    if (!userId) return;

    if (e.target.classList.contains("admin-btn-save")) {
      if (e.target.disabled) return;
      try {
        const displayName = row.querySelector(".admin-inp-display")?.value?.trim() || "";
        const sel = row.querySelector(".admin-sel-role");
        const body = { displayName };
        if (sel && !sel.disabled) body.accountRole = sel.value;
        await apiPatch(`/api/v1/admin/users/${encodeURIComponent(userId)}`, body);
        setAdminNotice(`已保存用户：${displayName || userId}`, "ok");
        await refreshAdminUsers();
        setTimeout(() => setAdminNotice(""), 3500);
      } catch (err) {
        setAdminNotice(err.message || "保存失败", "err");
      }
      return;
    }

    if (e.target.classList.contains("admin-btn-del")) {
      if (!window.confirm("确认删除该用户？其游戏数据将一并删除。")) return;
      try {
        await apiDelete(`/api/v1/admin/users/${encodeURIComponent(userId)}`);
        setAdminNotice("已删除用户。", "ok");
        await refreshAdminUsers();
        setTimeout(() => setAdminNotice(""), 3500);
      } catch (err) {
        setAdminNotice(err.message || "删除失败", "err");
      }
    }
  });
}

function syncProfileInputsFromDashboard() {
  const u = lastDashboard?.user;
  if (playerWorkloadInput && u?.dailyWorkloadTarget != null) {
    playerWorkloadInput.value = String(u.dailyWorkloadTarget);
  }
  if (playerDailyYuan && u?.dailyBudgetCents != null) {
    playerDailyYuan.value = String(Math.round(Number(u.dailyBudgetCents) / 100));
  }
}

async function refreshSummary() {
  const data = await apiGet("/api/v1/dashboard/summary");
  lastDashboard = data;
  const plan = data.weeklyPlan;
  const phaseKey = plan?.mainlinePhase || "intro";
  const phaseZh = PHASE_LABEL[phaseKey] || phaseKey;
  const w = data.today || {};
  const done = Number(w.completedDifficulty ?? 0);
  const target = Number(w.workloadTarget ?? data.user?.dailyWorkloadTarget ?? 12);

  hudCoins.textContent = `${data.wallet.coinBalance} 🪙`;
  hudTasks.textContent = `${done}/${target} 难度点`;
  hudRole.textContent = data.weeklyRoleDisplayName || plan?.roleCode || "未设置";
  hudPhase.textContent = `${phaseZh}`;
  hudBudget.textContent = `¥${(data.user.dailyBudgetCents / 100).toFixed(0)}`;
  const n = Number(data.activeConsequenceCount ?? 0);
  hudCons.textContent = n === 0 ? "无" : `${n} 条`;
  syncProfileInputsFromDashboard();
  renderWeeklyCareerFromDashboard();
}

function setProfessionSaveHint(message = "") {
  if (!professionSaveHint) return;
  professionSaveHint.textContent = message || "";
}

function getDayLogDate() {
  const v = dayLogDateInput?.value?.trim();
  if (v && /^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  return new Date().toISOString().slice(0, 10);
}

function renderWeeklyCareerFromDashboard() {
  if (!weeklyCareerBody) return;
  const w = lastDashboard?.weeklyCareer;
  const m = lastDashboard?.monthlyCareer;
  if (!w && !m) {
    weeklyCareerBody.innerHTML = `<div class="empty-state">保存周计划后，将显示本周与本月生涯叙事与进度。</div>`;
    return;
  }
  const tierBlock = (w?.tiers || [])
    .map((t) => {
      const line = t.reached
        ? `已达成 · 奖励 <b>${t.coins}</b> 🪙${t.claimed ? "（已领取）" : ""}`
        : `未达成（需本周累计难度点 ≥ 目标的 ${t.thresholdPct}%）`;
      return `<div class="reward-row" style="padding:8px 0;border:none">
        <div><b>${escapeHtml(t.label)}</b> <span class="small" style="opacity:0.85">· 门槛 ${t.thresholdPct}%</span></div>
        <div class="small">${line}</div>
      </div>`;
    })
    .join("");
  const monthlyBlock =
    m && !m.atMaxLevel
      ? `<hr class="soft" style="margin:16px 0" />
    <div style="margin-bottom:8px"><strong>本月职称晋升</strong> <span class="small" style="opacity:0.85">（自然月）</span></div>
    <div class="row" style="flex-wrap:wrap;gap:12px;margin-bottom:8px">
      <span>月标识：<code>${escapeHtml(m.monthKey || "—")}</code></span>
      <span>当前职称：<b>${escapeHtml(m.title || "—")}</b></span>
      <span>阶段：<b>${escapeHtml(m.careerStageLabel || "—")}</b> · 档 <b>${escapeHtml(String(m.tierInStage ?? "—"))}</b></span>
    </div>
    <div class="row" style="flex-wrap:wrap;gap:12px;margin-bottom:8px">
      <span>本月复杂分：<b>${escapeHtml(String(m.monthPromotionPoints))}</b> / 晋升门槛 <b>${escapeHtml(String(m.promotionThreshold))}</b></span>
    </div>
    <p class="small" style="margin:0;line-height:1.5;opacity:0.9">${escapeHtml(m.complexScoreRule || "")}。未达标则月末失去一次晋升机会，职称保留至次月再争取。</p>`
      : m && m.atMaxLevel
        ? `<hr class="soft" style="margin:16px 0" />
    <div><strong>本月职称晋升</strong>：已达当前职业路径最高档 <b>${escapeHtml(m.title || "")}</b>。</div>`
        : "";

  const weeklyHead = w
    ? `<div style="margin-bottom:10px"><strong>${escapeHtml(w.title || "本周生涯")}</strong></div>
    <p style="margin:0 0 12px;line-height:1.55">${escapeHtml(w.narrative || "")}</p>
    <div class="row" style="flex-wrap:wrap;gap:12px;margin-bottom:10px">
      <span>周标识：<code>${escapeHtml(w.weekKey || "—")}</code></span>
      <span>本周累计难度点：<b>${escapeHtml(String(w.earnedPoints))}</b> / 目标 <b>${escapeHtml(String(w.targetPoints))}</b></span>
      <span>进度：<b>${escapeHtml(String(w.percent))}%</b>${w.cleared ? " · 已通关本周线" : ""}</span>
    </div>
    <div style="margin-top:8px"><strong class="small">分档额外奖励</strong></div>
    ${tierBlock}`
    : `<div class="small" style="margin-bottom:10px;opacity:0.9">暂无本周生涯数据（需有效周计划与周标识）。</div>`;

  weeklyCareerBody.innerHTML = `${weeklyHead}
    ${monthlyBlock}
  `;
}

function renderTaskCard(t) {
  const mandatory = t.sourceType === "mandatory";
  const mainline = t.isMainline;
  const defectHit = t.targetsWeeklyDefects;
  const badges = [
    `<span class="badge ${mandatory ? "badge-mandatory" : "badge-optional"}">${mandatory ? "必做" : escapeHtml(t.sourceType || "其它")}</span>`,
    `<span class="badge badge-pending">${escapeHtml(TASK_STATUS_ZH[t.status] ?? "待完成")}</span>`,
  ];
  if (mainline) badges.push(`<span class="badge badge-mainline">主线</span>`);
  if (defectHit) badges.push(`<span class="badge badge-defect">对焦点</span>`);

  const detailBtn =
    mainline && mandatory
      ? `<button type="button" class="btn btn-ghost" onclick="window.openTaskDetail('${escapeHtml(t.id)}')">详情</button>`
      : "";

  const actions = `${detailBtn}<button type="button" class="btn btn-success" onclick="window.completeTask('${escapeHtml(t.id)}')">完成 ✓</button>
         <button type="button" class="btn btn-ghost" onclick="window.quickEditTask('${escapeHtml(t.id)}')">改标题</button>
         <button type="button" class="btn btn-danger" onclick="window.deleteTask('${escapeHtml(t.id)}')">删除</button>`;

  return `<div class="task-card">
    <div>
      <div class="badges">${badges.join("")}</div>
      <div class="title" style="margin-top:8px">${escapeHtml(t.title)}</div>
      <div class="small" style="margin-top:6px">奖励 ${t.rewardCoin} 枚 🪙 · 难度 ${t.difficulty ?? "—"}</div>
    </div>
    <div class="row" style="margin:0; justify-content:flex-end;flex-wrap:wrap;gap:6px">${actions}</div>
  </div>`;
}

async function refreshTasks() {
  const data = await apiGet("/api/v1/tasks/today");
  const w = lastDashboard?.today;
  if (workloadBarWrap && workloadBarInner && workloadBarMeta) {
    if (w && (w.workloadTarget != null || w.scheduledDifficulty != null)) {
      workloadBarWrap.style.display = "";
      const target = Math.max(1, Number(w.workloadTarget) || 12);
      const done = Number(w.completedDifficulty ?? 0);
      const sched = Number(w.scheduledDifficulty ?? 0);
      const denom = Math.max(target, sched, 1);
      const pct = Math.min(100, Math.round((done / denom) * 100));
      workloadBarInner.style.width = `${pct}%`;
      workloadBarMeta.textContent = `今日工作量：已完成 ${done} / 目标 ${target} 难度点 · 本日已排班 ${sched} 点（含下方「自填实事」）`;
    } else {
      workloadBarWrap.style.display = "none";
    }
  }
  const rowCount = Number(data.todayRowCount);
  const hasAnyToday = Number.isFinite(rowCount) ? rowCount > 0 : false;
  Object.keys(lastTodayTasksById).forEach((k) => delete lastTodayTasksById[k]);
  (data.tasks || []).forEach((t) => {
    lastTodayTasksById[t.id] = t;
  });
  if (!data.tasks || data.tasks.length === 0) {
    const hint = hasAnyToday
      ? "今日主线已全部完成；可用下方「自填实事」继续累积难度点，或点「安排今日任务」补新主线。"
      : "今天还没有主线任务，点「安排今日任务」即可按目标工作量排班。";
    tasksData.innerHTML = `<div class="empty-state">${hint}</div>`;
    return;
  }
  tasksData.innerHTML = data.tasks.map(renderTaskCard).join("");
}

async function refreshSessions() {
  const data = await apiGet("/api/v1/chat/sessions");
  if (!data.sessions || data.sessions.length === 0) {
    sessionsData.innerHTML = "暂无会话";
    return;
  }
  sessionsData.innerHTML = data.sessions
    .map(
      (s) =>
        `<div class="reward-row" style="padding:6px 0">
          <span>${escapeHtml(s.id)} · ${escapeHtml(s.roleCode)} · 消息 ${s._count?.messages ?? 0}</span>
          <button type="button" class="btn btn-ghost" onclick="window.loadSession('${escapeHtml(s.id)}')">打开</button>
        </div>`,
    )
    .join("");
}

async function loadWeeklyReview() {
  const weekKey = queryReviewWeekKey.value.trim();
  if (!weekKey) {
    setError("请输入要查询的周标识");
    return;
  }
  const data = await apiGet(`/api/v1/reports/weekly-review/${encodeURIComponent(weekKey)}`);
  reviewRecordData.innerHTML = data.review
    ? `「${escapeHtml(data.review.weekKey)}」${escapeHtml(data.review.summary)}<br><b>策略</b>：${escapeHtml(data.review.strategy)}`
    : "该周暂无复盘记录";
}

async function refreshSelfRewardsList() {
  if (!selfRewardsList) return;
  const date = getDayLogDate();
  const data = await apiGet(`/api/v1/rewards/self?date=${encodeURIComponent(date)}`);
  const rows = data.rewards || [];
  if (rows.length === 0) {
    selfRewardsList.innerHTML = `<div class="empty-state" style="padding:8px 0">该日尚无奖励记录。</div>`;
    return;
  }
  selfRewardsList.innerHTML = rows
    .map((r) => {
      const yuan = (Number(r.amountCents) / 100).toFixed(2);
      const pct = (Number(r.budgetPercentBps) / 100).toFixed(1);
      const note = r.note ? ` · ${escapeHtml(r.note)}` : "";
      return `<div class="reward-row" style="flex-wrap:wrap;align-items:center">
        <div style="flex:1;min-width:180px">
          <b>${escapeHtml(r.title)}</b>
          <span class="small" style="display:block;margin-top:4px">¥${escapeHtml(yuan)} · 约占日预算 ${escapeHtml(pct)}% · 扣 ${escapeHtml(String(r.coinSpent))} 🪙${note}</span>
        </div>
        <button type="button" class="btn btn-ghost" onclick="window.deleteSelfRewardRecord('${escapeHtml(r.id)}')">撤销</button>
      </div>`;
    })
    .join("");
}

function renderDayLog(data) {
  if (!dayLogBody) return;
  const entries = data.entries || [];
  if (entries.length === 0) {
    dayLogBody.innerHTML = `<div class="empty-state">该日尚无日志（无已完成任务、无奖励记录、无宠物事件）。</div>`;
    return;
  }
  dayLogBody.innerHTML = entries
    .map((e) => {
      const when = e.at ? escapeHtml(String(e.at).slice(0, 19).replace("T", " ")) : "—";
      if (e.kind === "task_completed") {
        const tag =
          e.isMainline ? "主线" : e.sourceType === "self_report" ? "自填" : e.sourceType === "optional" ? "支线" : "必做";
        return `<div class="reward-row" style="border-left:3px solid var(--accent-2);padding-left:12px;margin-bottom:10px">
          <div class="small" style="opacity:0.85">${when}</div>
          <div><b>✓ 任务</b> · ${escapeHtml(tag)} · ${escapeHtml(e.title)}</div>
          <div class="small">难度 ${escapeHtml(String(e.difficulty ?? "—"))} · 获得 ${escapeHtml(String(e.rewardCoinEarned ?? 0))} 🪙</div>
        </div>`;
      }
      if (e.kind === "self_reward") {
        const yuan = (Number(e.amountCents) / 100).toFixed(2);
        const pct = (Number(e.budgetPercentBps) / 100).toFixed(1);
        const note = e.note ? ` · ${escapeHtml(e.note)}` : "";
        return `<div class="reward-row" style="border-left:3px solid var(--accent);padding-left:12px;margin-bottom:10px">
          <div class="small" style="opacity:0.85">${when}</div>
          <div><b>🎁 自我奖励</b> · ${escapeHtml(e.title)}</div>
          <div class="small">¥${escapeHtml(yuan)} · 约占日预算 ${escapeHtml(pct)}% · 扣 ${escapeHtml(String(e.coinSpent))} 🪙${note}</div>
        </div>`;
      }
      if (e.kind === "pet_event") {
        const tag =
          e.eventType === "pet_illness"
            ? "生病"
            : e.eventType === "pet_illness_penalty"
              ? "生病后果"
              : e.eventType === "pet_training_dirty"
                ? "训练"
                : e.eventType === "pet_item_side_effect"
                  ? "用品副作用"
                  : "宠物";
        return `<div class="reward-row" style="border-left:3px solid #c084fc;padding-left:12px;margin-bottom:10px">
          <div class="small" style="opacity:0.85">${when}</div>
          <div><b>🐾 ${escapeHtml(tag)}</b></div>
          <div class="small" style="margin-top:4px;line-height:1.45">${escapeHtml(e.title)}</div>
        </div>`;
      }
      return "";
    })
    .filter(Boolean)
    .join("");
}

async function refreshDayLog() {
  if (!dayLogBody) return;
  const date = getDayLogDate();
  const data = await apiGet(`/api/v1/logs/day?date=${encodeURIComponent(date)}`);
  renderDayLog(data);
}

async function refreshRewardCatalogRootOnly() {
  if (!rewardsData || currentRole !== "root") return;
  const data = await apiGet("/api/v1/rewards/catalog");
  if (!data.rewards || data.rewards.length === 0) {
    rewardsData.innerHTML = `<div class="empty-state">目录为空；玩家端已改用「今日奖励记录」。</div>`;
    return;
  }
  rewardsData.innerHTML = data.rewards
    .map((r) => {
      const eff = r.effectiveBudgetCents != null ? r.effectiveBudgetCents : r.budgetCostCents;
      return `<div class="reward-row" style="flex-wrap:wrap">
      <div style="flex:1;min-width:200px">
        <span class="${tierClass(r.tier)}"><b>${escapeHtml(r.title)}</b> · ${escapeHtml(r.tier)}</span>
        <span class="small" style="display:block;margin-top:4px">${r.coinCost} 🪙 · 约 ¥${(eff / 100).toFixed(2)}</span>
      </div>
      <button type="button" class="btn btn-success" onclick="window.redeemReward('${escapeHtml(r.id)}')">兑换</button>
      <button type="button" class="btn btn-danger" onclick="window.deleteReward('${escapeHtml(r.id)}')">删除</button>
    </div>`;
    })
    .join("");
}

async function refreshProfession() {
  const [rolesRes, planRes] = await Promise.all([
    apiGet("/api/v1/professions/roles"),
    apiGet("/api/v1/professions/weekly-plan"),
  ]);
  fillRoleSelects(rolesRes.roles);

  const plan = planRes.plan;
  if (!plan) {
    professionData.innerHTML =
      currentRole === "root"
        ? "当前为管理员账号，未绑定周职业数据；可用「用户管理」创建玩家账号进行体验。"
        : "暂无周计划，保存一次即可。";
    return;
  }
  if (plan?.roleCode) {
    weeklyRole.value = plan.roleCode;
    roleSelect.value = plan.roleCode;
  }
  if (plan?.weekKey) weekKeyInput.value = plan.weekKey;

  const focus = parseDefectFocus(plan?.defectFocusTagsJson);
  defectTag1.value = focus[0] || "";
  defectTag2.value = focus[1] || "";

  const phaseKey = plan?.mainlinePhase || "intro";
  const phaseZh = PHASE_LABEL[phaseKey] || phaseKey;
  const roleNameByCode = Object.fromEntries(rolesRes.roles.map((r) => [r.code, r.displayName]));
  const roleZh = plan?.roleCode ? roleNameByCode[plan.roleCode] || plan.roleCode : "未设置";
  const roleListZh = rolesRes.roles.map((r) => `${escapeHtml(r.displayName)}`).join(" · ");

  if (currentRole === "player") {
    professionData.innerHTML =
      `本周人设：<b>${escapeHtml(roleZh)}</b> · 阶段 <b>${escapeHtml(phaseZh)}</b><br>` +
      `小目标标签：${focus.map((x) => `「${escapeHtml(x)}」`).join(" ") || "（默认）"}<br>` +
      `<span class="small">现实身份已与本周职业同步为「${escapeHtml(roleZh)}」。</span>`;
  } else {
    professionData.innerHTML =
      `当前职业：<b>${escapeHtml(roleZh)}</b> · 周 <code>${escapeHtml(plan?.weekKey || "—")}</code><br>` +
      `主线阶段：<b>${escapeHtml(phaseZh)}</b> · 本周已完成主线必做：<b>${plan?.mainlineCompletionsWeek ?? 0}</b> 次<br>` +
      `缺点焦点：${focus.map((x) => `「${escapeHtml(x)}」`).join(" ") || "（默认）"}<br>` +
      `<span class="small">保存周计划后，用户「现实身份」字段会与所选职业代码同步（供 NPC 语境）。可选职业：${roleListZh}</span>`;
  }
}

async function refreshConsequencesAndReport() {
  const [cons, report] = await Promise.all([
    apiGet("/api/v1/consequences/current"),
    apiGet("/api/v1/reports/weekly"),
  ]);
  if (!cons.consequences || cons.consequences.length === 0) {
    consequenceData.innerHTML =
      currentRole === "player"
        ? "状态清爽，没有额外 debuff～"
        : "暂无进行中的影响 · 继续保持就很酷";
  } else {
    consequenceData.innerHTML = cons.consequences
      .map((c) => {
        const weight =
          currentRole === "player"
            ? ""
            : ` <span class="small">（权重：${escapeHtml(String(c.penaltyCoinRate))}）</span>`;
        return `<div class="reward-row" style="border:none;padding:4px 0">⚠ ${escapeHtml(formatConsequenceLine(c))}${weight}</div>`;
      })
      .join("");
  }
  const sug = (report.suggestions || []).map((s) => `<div>💡 ${escapeHtml(s)}</div>`).join("");
  reportData.innerHTML =
    `<div style="margin-bottom:8px">周完成率 <b>${(report.completionRate * 100).toFixed(0)}%</b>（${report.completed}/${report.total}）· 风险 <b>${escapeHtml(RISK_LEVEL_ZH[report.riskLevel] || report.riskLevel)}</b></div>` +
    sug;
}

async function refreshSyncStatus() {
  if (!syncData) return;
  const data = await apiGet("/api/v1/sync/status");
  syncData.innerHTML = `待同步 <b>${data.pending}</b> · 已成功 <b>${data.success}</b> · 合计 <b>${data.total}</b>`;
}

function renderPetPanel(data) {
  if (!petPanel) return;
  const p = data?.pet;
  if (!p) {
    petPanel.innerHTML = `<div class="empty-state">暂无宠物数据。</div>`;
    return;
  }
  const titleByCode = {};
  (data.catalog || []).forEach((c) => {
    titleByCode[c.code] = c.title;
  });
  const statRow = (label, val) => {
    const v = Math.min(100, Math.max(0, Number(val) || 0));
    return `<div style="margin-bottom:10px">
      <div class="small" style="display:flex;justify-content:space-between;margin-bottom:4px"><span>${escapeHtml(label)}</span><span>${v}</span></div>
      <div class="workload-bar-outer" style="height:8px" aria-hidden="true"><div class="workload-bar-inner" style="width:${v}%"></div></div>
    </div>`;
  };
  const statsHtml =
    statRow("健康", p.health) +
    statRow("清洁", p.cleanliness) +
    statRow("智力", p.intelligence) +
    statRow("战斗力（预）", p.combatPower);
  const debuffs = data.activeDebuffs || [];
  const debuffHtml =
    debuffs.length === 0
      ? `<div class="small" style="opacity:0.88;margin:8px 0">当前没有进行中的 debuff～</div>`
      : debuffs
          .map((d) => {
            const deadline =
              d.medicineDeadlineAt && d.code === "illness"
                ? `<span class="small" style="display:block;margin-top:4px;opacity:0.9">药剂截止：${escapeHtml(
                    d.medicineDeadlineAt.slice(0, 16).replace("T", " "),
                  )}</span>`
                : "";
            return `<div class="reward-row" style="padding:8px 0;border:none">
            <div><b>${escapeHtml(d.label)}</b></div>
            <div class="small" style="margin-top:4px;line-height:1.45">${escapeHtml(d.hint)}</div>${deadline}
          </div>`;
          })
          .join("");
  const shopHtml = (data.catalog || [])
    .map((c) => {
      const safeCode = String(c.code || "").replace(/[^a-z0-9_]/gi, "");
      if (!safeCode) return "";
      const tip = c.description ? ` title="${escapeHtml(c.description)}"` : "";
      return `<button type="button" class="btn btn-ghost" style="margin:4px 6px 4px 0"${tip} onclick="window.buyPetShopItem('${escapeHtml(safeCode)}')">${escapeHtml(c.title)} · ${c.coinCost}🪙</button>`;
    })
    .join("");
  const urgent = data.petUrgentNotice
    ? `<div role="alert" style="margin-bottom:12px;padding:10px 12px;border-radius:10px;border:1px solid rgba(220,38,38,0.45);background:rgba(220,38,38,0.12);line-height:1.5">${escapeHtml(data.petUrgentNotice)}</div>`
    : "";
  const bag = (data.inventory || []).filter((x) => x.quantity > 0);
  const bagHtml =
    bag.length === 0
      ? `<div class="small" style="opacity:0.85;margin-top:8px">背包空空，先在商店买一点吧。</div>`
      : bag
          .map((x) => {
            const safeCode = String(x.itemCode || "").replace(/[^a-z0-9_]/gi, "");
            const t = titleByCode[safeCode] || safeCode;
            return `<button type="button" class="btn btn-primary" style="margin:4px 6px 4px 0" onclick="window.usePetBagItem('${escapeHtml(safeCode)}')">用 ${escapeHtml(t)}（${x.quantity}）</button>`;
          })
          .join("");
  petPanel.innerHTML = `
    ${urgent}
    <div style="margin-bottom:10px"><strong>${escapeHtml(p.displayName || "小伙伴")}</strong></div>
    ${statsHtml}
    <div style="margin-top:12px"><strong class="small">进行中的状况</strong></div>
    ${debuffHtml}
    <div style="margin-top:14px"><strong class="small">商店（代币）</strong></div>
    <div class="row" style="flex-wrap:wrap;margin-top:6px">${shopHtml || "—"}</div>
    <div style="margin-top:14px"><strong class="small">背包</strong></div>
    <div class="row" style="flex-wrap:wrap;margin-top:6px">${bagHtml}</div>
  `;
}

async function refreshPet() {
  if (!petPanel) return;
  try {
    const data = await apiGet("/api/v1/pet");
    renderPetPanel(data);
  } catch (err) {
    petPanel.innerHTML = `<div class="small" style="opacity:0.9">宠物加载失败：${escapeHtml(err.message || "错误")}</div>`;
  }
}

async function refreshAll() {
  setError("");
  const btn = refreshAllBtn;
  if (btn) {
    btn.disabled = true;
    btn.setAttribute("aria-busy", "true");
  }
  if (refreshAllStatus) {
    refreshAllStatus.textContent = "正在刷新…";
  }
  try {
    await refreshSummary();
    const jobs = [
      refreshTasks(),
      refreshSelfRewardsList(),
      refreshRewardCatalogRootOnly(),
      refreshProfession(),
      refreshConsequencesAndReport(),
      refreshPet(),
    ];
    if (currentRole !== "player") jobs.push(refreshSyncStatus());
    await Promise.all(jobs);
    await refreshDayLog();
    if (refreshAllStatus) {
      refreshAllStatus.textContent = "已更新";
      setTimeout(() => {
        if (refreshAllStatus) refreshAllStatus.textContent = "";
      }, 2800);
    }
  } catch (err) {
    setError(err.message || "刷新失败");
    if (refreshAllStatus) {
      refreshAllStatus.textContent = "刷新未完成";
      setTimeout(() => {
        if (refreshAllStatus) refreshAllStatus.textContent = "";
      }, 4000);
    }
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.removeAttribute("aria-busy");
    }
  }
}

function appendMessage(type, text, npcSpeakerLabelZh) {
  const div = document.createElement("div");
  div.className = `msg ${type}`;
  let label = "你";
  if (type === "npc") {
    const z = npcSpeakerLabelZh != null ? String(npcSpeakerLabelZh).trim() : "";
    label = z || "对方";
  } else if (type !== "user") {
    label = type;
  }
  div.textContent = `${label}：${text}`;
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
}

function loadKey() {
  const key = localStorage.getItem(STORAGE_KEY) || "";
  apiKeyInput.value = key;
  if (aiProvider) {
    aiProvider.value = localStorage.getItem(STORAGE_LLM_PROVIDER) || "deepseek";
  }
  if (aiCustomBase) {
    aiCustomBase.value = localStorage.getItem(STORAGE_LLM_CUSTOM_BASE) || "";
  }
  if (aiModel) {
    aiModel.value = localStorage.getItem(STORAGE_LLM_MODEL) || "";
  }
  syncAiCustomBaseVisibility();
  setKeySaveStatus("");
}

saveKeyBtn.addEventListener("click", () => {
  const key = apiKeyInput.value.trim();
  if (!key) {
    setKeySaveStatus("请先填写密钥", "err");
    setError("请输入有效的 API密钥。");
    return;
  }
  if (aiProvider?.value === "custom" && !(aiCustomBase?.value || "").trim()) {
    setKeySaveStatus("请填写自定义根路径", "err");
    setError("选择「自定义兼容端点」时，请填写以 https 开头的 API 根路径（通常以 /v1 结尾）。");
    return;
  }
  localStorage.setItem(STORAGE_KEY, key);
  if (aiProvider) localStorage.setItem(STORAGE_LLM_PROVIDER, aiProvider.value);
  if (aiCustomBase) localStorage.setItem(STORAGE_LLM_CUSTOM_BASE, aiCustomBase.value.trim());
  if (aiModel) localStorage.setItem(STORAGE_LLM_MODEL, aiModel.value.trim());
  setError("");
  setKeySaveStatus("已保存密钥与模型选项 ✓", "ok");
  setTimeout(() => setKeySaveStatus(""), 4500);
});

if (aiProvider) {
  aiProvider.addEventListener("change", () => {
    syncAiCustomBaseVisibility();
  });
}

logoutBtn.addEventListener("click", () => {
  showAuthGate();
  loginUsernameInput.value = "";
  loginPasswordInput.value = "";
  if (regUsername) regUsername.value = "";
  if (regDisplayName) regDisplayName.value = "";
  if (regPassword) regPassword.value = "";
  if (regPassword2) regPassword2.value = "";
  setError("");
  setKeySaveStatus("");
  setAdminNotice("");
});

if (showRegisterBtn) showRegisterBtn.addEventListener("click", () => showRegisterMode());
if (showLoginBtn) showLoginBtn.addEventListener("click", () => showLoginMode());

async function publicValidateRegistration(loginUsername, password) {
  const resp = await fetch("/api/v1/auth/validate-registration", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ loginUsername, password }),
  });
  return parseJsonResponse(resp);
}

function setOnboardingError(msg) {
  if (!onboardingErr) return;
  if (!msg) {
    onboardingErr.style.display = "none";
    onboardingErr.textContent = "";
    return;
  }
  onboardingErr.textContent = msg;
  onboardingErr.style.display = "block";
}

function maybeOpenOnboarding(meUser) {
  if (!onboardingOverlay) return;
  const pending = meUser?.onboardingStep === "pending" && meUser?.accountRole !== "root";
  if (pending) {
    if (onboardDailyYuan && meUser?.dailyBudgetCents != null) {
      onboardDailyYuan.value = String(Math.round(Number(meUser.dailyBudgetCents) / 100));
    }
    if (onboardWorkload && meUser?.dailyWorkloadTarget != null) {
      onboardWorkload.value = String(meUser.dailyWorkloadTarget);
    }
    onboardingOverlay.style.display = "flex";
  } else {
    onboardingOverlay.style.display = "none";
  }
}

async function enterAppAfterAuth(token, user) {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
  currentRole = user.accountRole || "player";
  applyRoleToBody(currentRole);
  whoamiEl.textContent = `${user.loginUsername || ""} · ${
    { root: "管理员", player: "玩家", developer: "开发人员" }[currentRole] || currentRole
  }`;
  if (authGate) authGate.style.display = "none";
  if (mainApp) mainApp.style.display = "";
  setAuthFeedback("");
  showLoginMode();
  bindAdminUsersDelegation();
  if (currentRole === "root") await refreshAdminUsers();
  loadKey();
  try {
    const me = await apiGet("/api/v1/auth/me");
    maybeOpenOnboarding(me.user);
  } catch {
    if (onboardingOverlay) onboardingOverlay.style.display = "none";
  }
  if (dayLogDateInput) {
    dayLogDateInput.value = new Date().toISOString().slice(0, 10);
  }
  if (daySummaryOut) {
    daySummaryOut.style.display = "none";
    daySummaryOut.textContent = "";
  }
  await refreshAll();
}

loginBtn.addEventListener("click", async () => {
  setAuthFeedback("");
  try {
    const loginUsername = loginUsernameInput.value.trim();
    const password = loginPasswordInput.value;
    const { token, user } = await authLogin(loginUsername, password);
    await enterAppAfterAuth(token, user);
  } catch (err) {
    setAuthFeedback(err.message || "登录失败", "err");
  }
});

if (registerBtn) {
  registerBtn.addEventListener("click", async () => {
    setAuthFeedback("");
    const loginUsername = regUsername.value.trim();
    const password = regPassword.value;
    const password2 = regPassword2.value;
    if (password !== password2) {
      setAuthFeedback("两次输入的密码不一致。", "err");
      return;
    }
    try {
      const check = await publicValidateRegistration(loginUsername, password);
      if (!check.ok) {
        const msg = Object.values(check.errors || {})
          .filter((x) => typeof x === "string" && x.trim())
          .join(" ");
        setAuthFeedback(msg || "请检查输入。", "err");
        return;
      }
      const regBody = {
        loginUsername,
        password,
        displayName: regDisplayName.value.trim() || undefined,
      };
      const dy = regDailyYuan?.value != null ? Number(String(regDailyYuan.value).trim()) : NaN;
      if (Number.isFinite(dy) && dy > 0) {
        regBody.dailyBudgetYuan = dy;
      }
      const { token, user } = await publicPost("/api/v1/auth/register", regBody);
      await enterAppAfterAuth(token, user);
    } catch (err) {
      setAuthFeedback(err.message || "注册失败", "err");
    }
  });
}

clearBtn.addEventListener("click", () => {
  conversation = [];
  chat.innerHTML = "";
  setError("");
});

refreshAllBtn.addEventListener("click", refreshAll);
if (evalConsequenceBtn) {
  evalConsequenceBtn.addEventListener("click", async () => {
    try {
      await apiPost("/api/v1/consequences/evaluate", {});
      await refreshAll();
    } catch (err) {
      setError(err.message || "评估失败");
    }
  });
}

if (refreshTodayTasksBtn) {
  refreshTodayTasksBtn.addEventListener("click", async () => {
    setError("");
    let confirmMsg = "";
    try {
      const snap = await apiGet("/api/v1/tasks/today");
      const total = Number(snap.todayRowCount);
      const pending = Array.isArray(snap.tasks) ? snap.tasks.length : 0;
      if (!Number.isFinite(total) || total <= 0) {
        confirmMsg = "";
      } else if (pending === 0) {
        confirmMsg =
          "今日待办已全部完成；将按目标工作量再补一批新任务（已完成的记录保留）。继续？";
      } else {
        confirmMsg =
          "今日尚有未完成任务：将删除「未完成」项并重新排班；已完成的任务与进度会保留，并补足与目标工作量之间的差额。确定继续？";
      }
    } catch {
      confirmMsg =
        "将按服务器侧今日任务情况排班（若有未完成可能被清空并重排）。确定继续？";
    }
    if (confirmMsg && !window.confirm(confirmMsg)) {
      return;
    }
    try {
      await apiPost("/api/v1/tasks/today/generate", { fullRefresh: true });
      await refreshAll();
    } catch (err) {
      setError(err.message || "排班失败");
    }
  });
}

saveWeeklyRoleBtn.addEventListener("click", async () => {
  try {
    setProfessionSaveHint("");
    const tags = [defectTag1.value.trim(), defectTag2.value.trim()].filter(Boolean);
    await apiPost("/api/v1/professions/weekly-plan", {
      role: weeklyRole.value,
      weekKey: weekKeyInput.value.trim() || undefined,
      defectFocusTags: tags.length ? tags : undefined,
    });
    await refreshAll();
    setProfessionSaveHint("周计划已保存；现实身份已与所选职业同步。");
    setTimeout(() => setProfessionSaveHint(""), 5000);
  } catch (err) {
    setError(err.message || "保存周职业失败");
  }
});

if (submitSelfActivityBtn) {
  submitSelfActivityBtn.addEventListener("click", async () => {
    const text = (selfActivityDesc?.value || "").trim();
    if (text.length < 8) {
      if (selfActivityHint) selfActivityHint.textContent = "至少输入 8 个字。";
      return;
    }
    if (selfActivityHint) selfActivityHint.textContent = "评估中…";
    setError("");
    try {
      const key = (apiKeyInput?.value || "").trim();
      const res = await apiPost("/api/v1/tasks/self-activity", {
        description: text,
        ...(key ? { apiKey: key } : {}),
        ...getLlmRequestBody(),
      });
      if (selfActivityDesc) selfActivityDesc.value = "";
      const src = res.evaluation?.source === "ai" ? "模型" : "启发式";
      if (selfActivityHint) {
        selfActivityHint.textContent = `已记录「${res.task?.title || ""}」· 难度 ${res.task?.difficulty} · +${res.rewardCoin}🪙（${src}）`;
      }
      await refreshAll();
      await refreshDayLog();
      setTimeout(() => {
        if (selfActivityHint) selfActivityHint.textContent = "";
      }, 5500);
    } catch (err) {
      if (selfActivityHint) selfActivityHint.textContent = "";
      setError(err.message || "提交失败");
    }
  });
}

if (addTaskBtn) {
  addTaskBtn.addEventListener("click", async () => {
    try {
      const title = newTaskTitle.value.trim();
      if (!title) return;
      const key = (apiKeyInput?.value || "").trim();
      let difficulty;
      let rewardCoin = Number(newTaskReward.value || 0) || undefined;
      if (key) {
        const ev = await apiPost("/api/v1/tasks/evaluate-difficulty", {
          title,
          apiKey: key,
          ...getLlmRequestBody(),
        });
        difficulty = ev.difficulty;
        if (!rewardCoin) rewardCoin = ev.suggestedRewardCoin;
      }
      await apiPost("/api/v1/tasks", {
        title,
        sourceType: newTaskSourceType.value,
        rewardCoin,
        difficulty,
      });
      newTaskTitle.value = "";
      newTaskReward.value = "";
      await refreshAll();
    } catch (err) {
      setError(err.message || "新增任务失败");
    }
  });
}

if (addRewardBtn) {
  addRewardBtn.addEventListener("click", async () => {
    try {
      await apiPost("/api/v1/rewards", {
        title: newRewardTitle.value.trim(),
        tier: newRewardTier.value,
        coinCost: Number(newRewardCoinCost.value || 0) || undefined,
        budgetCostCents: Number(newRewardBudgetCost.value || 0) || undefined,
      });
      newRewardTitle.value = "";
      newRewardCoinCost.value = "";
      newRewardBudgetCost.value = "";
      await refreshAll();
    } catch (err) {
      setError(err.message || "新增奖励失败");
    }
  });
}

if (saveReviewBtn) {
  saveReviewBtn.addEventListener("click", async () => {
    try {
      await apiPost("/api/v1/reports/weekly-review", {
        weekKey: reviewWeekKey.value.trim(),
        summary: reviewSummary.value.trim(),
        strategy: reviewStrategy.value.trim(),
      });
      await loadWeeklyReview();
    } catch (err) {
      setError(err.message || "保存复盘失败");
    }
  });
}

if (loadReviewBtn) {
  loadReviewBtn.addEventListener("click", async () => {
    try {
      await loadWeeklyReview();
    } catch (err) {
      setError(err.message || "加载复盘失败");
    }
  });
}

if (loadSessionsBtn) {
  loadSessionsBtn.addEventListener("click", async () => {
    try {
      await refreshSessions();
    } catch (err) {
      setError(err.message || "加载历史会话失败");
    }
  });
}

if (createUserBtn) {
  createUserBtn.addEventListener("click", async () => {
    setAdminNotice("");
    try {
      const loginUsername = newUserLogin.value.trim();
      if (!loginUsername) {
        setAdminNotice("请填写用户名。", "err");
        return;
      }
      const body = {
        loginUsername,
        displayName: newUserDisplay.value.trim() || loginUsername,
        accountRole: newUserRole.value,
      };
      const pw = newUserPassword.value.trim();
      if (pw) body.password = pw;
      const created = await apiPost("/api/v1/admin/users", body);
      newUserLogin.value = "";
      newUserDisplay.value = "";
      newUserPassword.value = "";
      await refreshAdminUsers();
      const un = created.user?.loginUsername || loginUsername;
      setAdminNotice(`已创建用户「${un}」，对方可用该用户名登录。`, "ok");
      setTimeout(() => setAdminNotice(""), 5000);
    } catch (err) {
      setAdminNotice(err.message || "创建用户失败", "err");
    }
  });
}

sendBtn.addEventListener("click", async () => {
  setError("");
  const apiKey = apiKeyInput.value.trim();
  const text = input.value.trim();

  if (!apiKey) {
    setError("请先输入并保存 API密钥。");
    return;
  }
  if (aiProvider?.value === "custom" && !(aiCustomBase?.value || "").trim()) {
    setError("选择「自定义兼容端点」时，请填写 API 根路径（https…，一般以 /v1 结尾）。");
    return;
  }
  if (!text) {
    setError("请输入消息内容。");
    return;
  }

  appendMessage("user", text);
  conversation.push({ role: "user", content: text });
  input.value = "";
  sendBtn.disabled = true;

  try {
    const data = await apiPost("/api/v1/chat/npc", {
      apiKey,
      role: roleSelect.value,
      messages: conversation.slice(-12),
      userContext: {},
      ...getLlmRequestBody(),
    });

    appendMessage("npc", data.reply, data.npcSpeakerLabelZh);
    conversation.push({ role: "assistant", content: data.reply });
    const tu = data.tokenUsage;
    const total =
      tu && typeof tu === "object"
        ? tu.totalTokens ?? tu.total_tokens ?? (Number(tu.promptTokens) || 0) + (Number(tu.completionTokens) || 0)
        : null;
    if (total != null && Number.isFinite(Number(total)) && Number(total) > 0 && keySaveStatus) {
      keySaveStatus.textContent = `本次对话约 ${Number(total)} tokens（厂商后台统计可能有延迟）`;
      keySaveStatus.className = "key-save-status ok";
      setTimeout(() => setKeySaveStatus(""), 8000);
    }
  } catch (err) {
    setError(err.message || "调用失败，请稍后重试。");
  } finally {
    sendBtn.disabled = false;
  }
});

async function bootstrapSession() {
  loadKey();
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  if (!token) {
    showAuthGate();
    return;
  }
  try {
    const me = await apiGet("/api/v1/auth/me");
    currentRole = me.user.accountRole || "player";
    applyRoleToBody(currentRole);
    whoamiEl.textContent = `${me.user.loginUsername || ""} · ${
      { root: "管理员", player: "玩家", developer: "开发人员" }[currentRole] || currentRole
    }`;
    if (authGate) authGate.style.display = "none";
    if (mainApp) mainApp.style.display = "";
    maybeOpenOnboarding(me.user);
    if (currentRole === "root") {
      bindAdminUsersDelegation();
      await refreshAdminUsers();
    }
    if (dayLogDateInput) {
      dayLogDateInput.value = new Date().toISOString().slice(0, 10);
    }
    if (daySummaryOut) {
      daySummaryOut.style.display = "none";
      daySummaryOut.textContent = "";
    }
    await refreshAll();
  } catch {
    showAuthGate();
  }
}

if (onboardingSubmitBtn) {
  onboardingSubmitBtn.addEventListener("click", async () => {
    setOnboardingError("");
    try {
      const yuan = Number(onboardDailyYuan?.value);
      const workload = Number(onboardWorkload?.value);
      const lines = (onboardTasks?.value || "")
        .split(/\n+/)
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 5);
      const key = (onboardApiKey?.value || "").trim() || (apiKeyInput?.value || "").trim();
      await apiPost("/api/v1/auth/onboarding", {
        dailyBudgetYuan: Number.isFinite(yuan) && yuan > 0 ? yuan : undefined,
        dailyWorkloadTarget: Number.isFinite(workload) ? workload : undefined,
        initialTaskTitles: lines,
        apiKey: key || undefined,
        ...getLlmRequestBody(),
      });
      if (onboardingOverlay) onboardingOverlay.style.display = "none";
      await refreshAll();
    } catch (err) {
      setOnboardingError(err.message || "提交失败");
    }
  });
}

if (saveWorkloadBtn && playerWorkloadInput) {
  saveWorkloadBtn.addEventListener("click", async () => {
    setError("");
    try {
      await apiPatch("/api/v1/auth/me", {
        dailyWorkloadTarget: Number(playerWorkloadInput.value),
      });
      await refreshAll();
    } catch (err) {
      setError(err.message || "保存失败");
    }
  });
}

if (saveDailyBudgetBtn && playerDailyYuan) {
  saveDailyBudgetBtn.addEventListener("click", async () => {
    setError("");
    try {
      await apiPatch("/api/v1/auth/me", {
        dailyBudgetYuan: Number(playerDailyYuan.value),
      });
      await refreshAll();
    } catch (err) {
      setError(err.message || "保存失败");
    }
  });
}

if (addSelfRewardBtn) {
  addSelfRewardBtn.addEventListener("click", async () => {
    setError("");
    if (selfRewardHint) selfRewardHint.textContent = "";
    const title = (selfRewardTitle?.value || "").trim();
    const yuan = Number(selfRewardAmountYuan?.value);
    const note = (selfRewardNote?.value || "").trim();
    if (!title) {
      setError("请填写奖励说明。");
      return;
    }
    if (!Number.isFinite(yuan) || yuan <= 0) {
      setError("请填写大于 0 的金额（元）。");
      return;
    }
    try {
      addSelfRewardBtn.disabled = true;
      const res = await apiPost("/api/v1/rewards/self", {
        title,
        amountYuan: yuan,
        note: note || undefined,
        logDate: getDayLogDate(),
      });
      if (selfRewardTitle) selfRewardTitle.value = "";
      if (selfRewardAmountYuan) selfRewardAmountYuan.value = "";
      if (selfRewardNote) selfRewardNote.value = "";
      if (selfRewardHint && res?.reward) {
        const pct = (Number(res.reward.budgetPercentBps) / 100).toFixed(1);
        selfRewardHint.textContent = `已记录 · 约占日预算 ${pct}% · 扣除 ${res.reward.coinSpent} 🪙`;
        setTimeout(() => {
          if (selfRewardHint) selfRewardHint.textContent = "";
        }, 6000);
      }
      await refreshAll();
    } catch (err) {
      setError(err.message || "记录失败");
    } finally {
      addSelfRewardBtn.disabled = false;
    }
  });
}

if (refreshDayLogBtn) {
  refreshDayLogBtn.addEventListener("click", async () => {
    setError("");
    try {
      await refreshDayLog();
      await refreshSelfRewardsList();
    } catch (err) {
      setError(err.message || "刷新日志失败");
    }
  });
}

if (dayLogDateInput) {
  dayLogDateInput.addEventListener("change", async () => {
    setError("");
    try {
      await refreshDayLog();
      await refreshSelfRewardsList();
    } catch (err) {
      setError(err.message || "加载失败");
    }
  });
}

if (summarizeDayBtn) {
  summarizeDayBtn.addEventListener("click", async () => {
    setError("");
    const key = (apiKeyInput?.value || "").trim();
    if (!key) {
      setError("请先在顶栏填写并保存 API 密钥。");
      return;
    }
    if (aiProvider?.value === "custom" && !(aiCustomBase?.value || "").trim()) {
      setError("选择「自定义兼容端点」时，请填写 API 根路径。");
      return;
    }
    if (daySummaryOut) {
      daySummaryOut.style.display = "block";
      daySummaryOut.textContent = "正在生成总结…";
    }
    try {
      summarizeDayBtn.disabled = true;
      const res = await apiPost("/api/v1/logs/summarize-day", {
        apiKey: key,
        logDate: getDayLogDate(),
        ...getLlmRequestBody(),
      });
      if (daySummaryOut) {
        const tu = res?.llm?.usage;
        const total =
          tu && typeof tu === "object"
            ? tu.totalTokens ?? tu.total_tokens ?? (Number(tu.promptTokens) || 0) + (Number(tu.completionTokens) || 0)
            : null;
        const tail =
          total != null && Number.isFinite(Number(total)) && Number(total) > 0
            ? `\n\n—— 本次总结约 ${Number(total)} tokens ——`
            : "";
        daySummaryOut.textContent = (res.summary || "（无内容）") + tail;
      }
    } catch (err) {
      if (daySummaryOut) {
        daySummaryOut.textContent = "";
        daySummaryOut.style.display = "none";
      }
      setError(err.message || "总结失败");
    } finally {
      summarizeDayBtn.disabled = false;
    }
  });
}

if (resetProgressBtn) {
  resetProgressBtn.addEventListener("click", async () => {
    const phrase = (resetProgressConfirm?.value || "").trim();
    if (phrase !== "我确认重置") {
      setError("请在输入框中完整输入「我确认重置」。");
      return;
    }
    if (
      !window.confirm(
        "将清空任务、代币、兑换与自我奖励记录、宠物与背包、后果状态与周生涯领取标记等；保留登录账号与日预算等设置。此操作不可撤销，确定？",
      )
    ) {
      return;
    }
    setError("");
    try {
      await apiPost("/api/v1/auth/reset-progress", { confirmPhrase: phrase });
      if (resetProgressConfirm) resetProgressConfirm.value = "";
      await refreshAll();
    } catch (err) {
      setError(err.message || "重置失败");
    }
  });
}

bootstrapSession();

window.buyPetShopItem = async function buyPetShopItem(itemCode) {
  try {
    await apiPost("/api/v1/pet/shop/buy", { itemCode, quantity: 1 });
    await refreshSummary();
    await refreshPet();
  } catch (err) {
    setError(err.message || "购买失败");
  }
};

window.usePetBagItem = async function usePetBagItem(itemCode) {
  try {
    await apiPost("/api/v1/pet/inventory/use", { itemCode });
    await refreshSummary();
    await refreshPet();
    await refreshDayLog();
  } catch (err) {
    setError(err.message || "使用物品失败");
  }
};

window.openTaskDetail = function openTaskDetail(taskId) {
  const t = lastTodayTasksById[taskId];
  if (!taskDetailDialog || !t) return;
  const d = parseTaskDetailJson(t);
  if (taskDetailTitle) taskDetailTitle.textContent = t.title || "";
  const stepPart = d.step != null ? `步骤 ${d.step}` : "";
  const trackPart = d.track ? String(d.track) : "";
  const metaBits = [
    [stepPart, trackPart].filter(Boolean).join(" · "),
    `难度 ${t.difficulty ?? "—"} · 奖励 ${t.rewardCoin ?? 0} 🪙`,
  ].filter(Boolean);
  if (taskDetailMeta) taskDetailMeta.textContent = metaBits.join(" · ");
  const how = d.howTo || "（暂无分步说明：按标题理解执行即可，完成后请打卡。）";
  const why = d.why || "（暂无意义说明）";
  const rawExtra = d.raw
    ? `<h4>附注</h4><p>${escapeHtml(String(d.raw))}</p>`
    : "";
  if (taskDetailBody) {
    taskDetailBody.innerHTML = `<h4>建议做法</h4><p>${escapeHtml(String(how))}</p><h4>意义</h4><p>${escapeHtml(String(why))}</p>${rawExtra}`;
  }
  taskDetailDialog.showModal();
};

window.completeTask = async function completeTask(taskId) {
  try {
    const res = await apiPost(`/api/v1/tasks/${taskId}/complete`, { qualityScore: 1 });
    await refreshAll();
    const g = res?.weeklyCareerBonus?.granted;
    if (Array.isArray(g) && g.length) {
      const msg = g.map((x) => `${x.label} +${x.coins}🪙`).join("，");
      setProfessionSaveHint(`本周生涯档位奖励已入账：${msg}`);
      setTimeout(() => setProfessionSaveHint(""), 6500);
    }
  } catch (err) {
    setError(err.message || "完成任务失败");
  }
};

window.quickEditTask = async function quickEditTask(taskId) {
  const title = window.prompt("输入新的任务标题（留空则不改）");
  if (title === null) return;
  try {
    await apiPatch(`/api/v1/tasks/${taskId}`, { title });
    await refreshAll();
  } catch (err) {
    setError(err.message || "编辑任务失败");
  }
};

window.deleteTask = async function deleteTask(taskId) {
  if (!window.confirm("确认删除该任务？")) return;
  try {
    await apiDelete(`/api/v1/tasks/${taskId}`);
    await refreshAll();
  } catch (err) {
    setError(err.message || "删除任务失败");
  }
};

window.deleteSelfRewardRecord = async function deleteSelfRewardRecord(id) {
  if (!window.confirm("撤销该条奖励记录？将退回已扣代币。")) return;
  try {
    await apiDelete(`/api/v1/rewards/self/${encodeURIComponent(id)}`);
    await refreshAll();
  } catch (err) {
    setError(err.message || "撤销失败");
  }
};

window.redeemReward = async function redeemReward(rewardId) {
  try {
    const res = await apiPost("/api/v1/rewards/redeem", { rewardId });
    if (res?.milestoneAdded && selfRewardHint) {
      selfRewardHint.textContent = `「${String(res.milestoneAdded.title || "纪念礼")}」已记入里程碑收藏（旧版目录）`;
      setTimeout(() => {
        if (selfRewardHint) selfRewardHint.textContent = "";
      }, 6500);
    }
    await refreshAll();
  } catch (err) {
    setError(err.message || "兑换失败");
  }
};

window.deleteReward = async function deleteReward(rewardId) {
  if (!window.confirm("确认删除该奖励？")) return;
  try {
    await apiDelete(`/api/v1/rewards/${rewardId}`);
    await refreshAll();
  } catch (err) {
    setError(err.message || "删除奖励失败");
  }
};

window.loadSession = async function loadSession(sessionId) {
  try {
    const data = await apiGet(`/api/v1/chat/sessions/${sessionId}/messages`);
    chat.innerHTML = "";
    for (const msg of data.messages) {
      appendMessage(msg.messageRole === "assistant" ? "npc" : "user", msg.content);
    }
  } catch (err) {
    setError(err.message || "加载会话失败");
  }
};
