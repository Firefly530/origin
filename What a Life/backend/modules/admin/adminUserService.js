const { prisma } = require("../../db/prisma");
const { AppError } = require("../../core/errors");
const {
  hashPassword,
  DEFAULT_LOGIN_PASSWORD,
  normalizeLoginUsername,
  validateRegistrationFields,
} = require("../auth/authService");
const { ensureUserGameSeed, ROOT_USER_ID } = require("../../db/initData");

const VALID_ROLES = new Set(["root", "player", "developer"]);

async function listUsers() {
  return prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      loginUsername: true,
      displayName: true,
      accountRole: true,
      dailyBudgetCents: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

async function createUserByRoot(payload = {}) {
  const loginUsername = normalizeLoginUsername(payload.loginUsername);
  if (!loginUsername) {
    throw new AppError("USER_LOGIN_REQUIRED", "用户名不能为空。", 400);
  }
  const nameCheck = validateRegistrationFields(loginUsername, "abcdefgh");
  if (nameCheck.errors.loginUsername) {
    throw new AppError("USER_LOGIN_INVALID", nameCheck.errors.loginUsername, 400);
  }
  const existing = await prisma.user.findFirst({ where: { loginUsername } });
  if (existing) {
    throw new AppError("USER_LOGIN_TAKEN", "该登录名已被占用。", 409);
  }
  const accountRole = VALID_ROLES.has(String(payload.accountRole || "player"))
    ? String(payload.accountRole)
    : "player";
  if (accountRole === "root") {
    throw new AppError("USER_ROOT_FORBIDDEN", "不能通过此接口创建新的 root。", 400);
  }
  const displayName = String(payload.displayName || loginUsername).trim() || loginUsername;
  const password = payload.password != null ? String(payload.password) : DEFAULT_LOGIN_PASSWORD;
  const passwordHash = await hashPassword(password);
  const id = `u_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

  await prisma.user.create({
    data: {
      id,
      displayName,
      loginUsername,
      passwordHash,
      accountRole,
      dailyBudgetCents: Number(payload.dailyBudgetCents) || 25000,
      dailyWorkloadTarget: 12,
      onboardingStep: accountRole === "root" ? "done" : "pending",
    },
  });

  await ensureUserGameSeed(id, displayName);

  return prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      loginUsername: true,
      displayName: true,
      accountRole: true,
      dailyBudgetCents: true,
      createdAt: true,
    },
  });
}

async function deleteUserByRoot(targetUserId, actorUserId) {
  const tid = String(targetUserId || "");
  if (!tid) {
    throw new AppError("USER_ID_REQUIRED", "缺少用户 id。", 400);
  }
  if (tid === actorUserId) {
    throw new AppError("USER_DELETE_SELF", "不能删除当前登录账号。", 400);
  }
  if (tid === ROOT_USER_ID) {
    throw new AppError("USER_DELETE_ROOT", "不能删除 root 账号。", 400);
  }
  const target = await prisma.user.findUnique({ where: { id: tid } });
  if (!target) {
    throw new AppError("USER_NOT_FOUND", "用户不存在。", 404);
  }
  await prisma.user.delete({ where: { id: tid } });
  return { deleted: true, id: tid };
}

async function updateUserByRoot(targetUserId, payload = {}) {
  const tid = String(targetUserId || "");
  if (!tid) {
    throw new AppError("USER_ID_REQUIRED", "缺少用户 id。", 400);
  }
  const target = await prisma.user.findUnique({ where: { id: tid } });
  if (!target) {
    throw new AppError("USER_NOT_FOUND", "用户不存在。", 404);
  }

  const data = {};
  if (payload.displayName != null) {
    const dn = String(payload.displayName).trim();
    if (dn) data.displayName = dn;
  }
  if (payload.accountRole != null && tid !== ROOT_USER_ID) {
    const r = String(payload.accountRole);
    if (r !== "player" && r !== "developer") {
      throw new AppError("USER_ROLE_INVALID", "角色只能是玩家或开发人员。", 400);
    }
    data.accountRole = r;
  }

  if (Object.keys(data).length === 0) {
    throw new AppError("USER_UPDATE_EMPTY", "没有可更新的字段。", 400);
  }

  await prisma.user.update({ where: { id: tid }, data });

  return prisma.user.findUnique({
    where: { id: tid },
    select: {
      id: true,
      loginUsername: true,
      displayName: true,
      accountRole: true,
      dailyBudgetCents: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

module.exports = {
  listUsers,
  createUserByRoot,
  deleteUserByRoot,
  updateUserByRoot,
};
