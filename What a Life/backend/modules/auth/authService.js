const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { prisma } = require("../../db/prisma");
const { AppError } = require("../../core/errors");

const JWT_SECRET = process.env.JWT_SECRET || "what-a-life-dev-secret-change-me";
const SALT_ROUNDS = 10;
const DEFAULT_LOGIN_PASSWORD = "123456";

const RESERVED_USERNAMES = new Set(["root", "admin", "system", "support", "api"]);

function normalizeLoginUsername(raw) {
  return String(raw || "").trim().toLowerCase();
}

/**
 * 注册用校验（登录页与注册提交前可调用）。
 * @returns {{ ok: boolean, errors: Record<string, string> }}
 */
function validateRegistrationFields(loginUsername, password) {
  const errors = {};
  const name = normalizeLoginUsername(loginUsername);
  if (!name) {
    errors.loginUsername = "请填写用户名。";
  } else if (name.length < 3 || name.length > 32) {
    errors.loginUsername = "用户名为 3～32 个字符。";
  } else if (!/^[a-z0-9_]+$/.test(name)) {
    errors.loginUsername = "仅允许小写字母、数字与下划线。";
  } else if (RESERVED_USERNAMES.has(name)) {
    errors.loginUsername = "该用户名不可用。";
  }
  const pw = password != null ? String(password) : "";
  if (!pw) {
    errors.password = "请填写密码。";
  } else if (pw.length < 6 || pw.length > 128) {
    errors.password = "密码长度为 6～128 个字符。";
  }
  return { ok: Object.keys(errors).length === 0, errors };
}

async function hashPassword(plain) {
  return bcrypt.hash(String(plain || DEFAULT_LOGIN_PASSWORD), SALT_ROUNDS);
}

async function verifyPassword(plain, hash) {
  if (!hash || !plain) return false;
  return bcrypt.compare(String(plain), String(hash));
}

function signAuthToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      role: user.accountRole,
      loginUsername: user.loginUsername,
    },
    JWT_SECRET,
    { expiresIn: "7d" },
  );
}

function verifyAuthToken(token) {
  try {
    return jwt.verify(String(token || ""), JWT_SECRET);
  } catch {
    return null;
  }
}

async function loginWithUsernamePassword(loginUsername, password) {
  const name = normalizeLoginUsername(loginUsername);
  if (!name) {
    throw new AppError("LOGIN_USERNAME_REQUIRED", "请输入用户名。", 400);
  }
  const user = await prisma.user.findFirst({
    where: { loginUsername: name },
  });
  if (!user || !user.passwordHash) {
    throw new AppError("LOGIN_FAILED", "登录名或密码错误。", 401);
  }
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    throw new AppError("LOGIN_FAILED", "登录名或密码错误。", 401);
  }
  const token = signAuthToken(user);
  return {
    token,
    user: {
      id: user.id,
      loginUsername: user.loginUsername,
      displayName: user.displayName,
      accountRole: user.accountRole,
    },
  };
}

/**
 * 公开注册：创建「玩家」账号并写入与 root 管理同一用户表；自动下发游戏种子。
 */
async function registerPlayerUser(payload = {}) {
  const loginUsername = normalizeLoginUsername(payload.loginUsername);
  const password = payload.password;
  const { ok, errors } = validateRegistrationFields(loginUsername, password);
  if (!ok) {
    throw new AppError("REGISTER_INVALID", "注册信息未通过校验。", 400, errors);
  }
  const existing = await prisma.user.findFirst({ where: { loginUsername } });
  if (existing) {
    throw new AppError("USER_LOGIN_TAKEN", "该用户名已被注册。", 409);
  }
  const displayName = String(payload.displayName || loginUsername).trim() || loginUsername;
  const passwordHash = await hashPassword(password);
  const id = `u_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

  let dailyBudgetCents = Number(payload.dailyBudgetCents);
  if (payload.dailyBudgetYuan != null && !Number.isFinite(dailyBudgetCents)) {
    dailyBudgetCents = Math.round(Number(payload.dailyBudgetYuan) * 100);
  }
  if (!Number.isFinite(dailyBudgetCents) || dailyBudgetCents < 100) {
    dailyBudgetCents = 25000;
  }
  dailyBudgetCents = Math.min(5000000, Math.max(100, Math.round(dailyBudgetCents)));
  let dailyWorkloadTarget = Number(payload.dailyWorkloadTarget);
  if (!Number.isFinite(dailyWorkloadTarget)) dailyWorkloadTarget = 12;
  dailyWorkloadTarget = Math.min(22, Math.max(6, Math.round(dailyWorkloadTarget)));

  await prisma.user.create({
    data: {
      id,
      displayName,
      loginUsername,
      passwordHash,
      accountRole: "player",
      dailyBudgetCents,
      dailyWorkloadTarget,
      onboardingStep: "pending",
    },
  });

  const { ensureUserGameSeed } = require("../../db/initData");
  await ensureUserGameSeed(id, displayName);

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      loginUsername: true,
      displayName: true,
      accountRole: true,
    },
  });
  const token = signAuthToken(user);
  return {
    token,
    user: {
      id: user.id,
      loginUsername: user.loginUsername,
      displayName: user.displayName,
      accountRole: user.accountRole,
    },
  };
}

async function getAuthUserById(userId) {
  if (!userId) return null;
  return prisma.user.findUnique({
    where: { id: String(userId) },
    select: {
      id: true,
      loginUsername: true,
      displayName: true,
      accountRole: true,
      dailyBudgetCents: true,
      dailyWorkloadTarget: true,
      onboardingStep: true,
      identityRoleCode: true,
      createdAt: true,
    },
  });
}

module.exports = {
  hashPassword,
  verifyPassword,
  signAuthToken,
  verifyAuthToken,
  loginWithUsernamePassword,
  registerPlayerUser,
  validateRegistrationFields,
  normalizeLoginUsername,
  getAuthUserById,
  DEFAULT_LOGIN_PASSWORD,
  JWT_SECRET,
};
