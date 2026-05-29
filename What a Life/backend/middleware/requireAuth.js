const { AppError } = require("../core/errors");
const { verifyAuthToken, getAuthUserById } = require("../modules/auth/authService");

function bearerToken(req) {
  const h = req.headers.authorization;
  if (typeof h !== "string" || !h.startsWith("Bearer ")) return null;
  return h.slice(7).trim() || null;
}

function requireAuth(req, _res, next) {
  const token = bearerToken(req);
  const payload = token ? verifyAuthToken(token) : null;
  if (!payload?.sub) {
    return next(new AppError("AUTH_REQUIRED", "请先登录。", 401));
  }
  req.auth = {
    userId: String(payload.sub),
    role: String(payload.role || "player"),
    loginUsername: payload.loginUsername ? String(payload.loginUsername) : null,
  };
  next();
}

/** 在需要时把数据库里的最新角色附加到 req.auth（用于权限变更后立即生效的可选校验） */
async function attachAuthUser(req, _res, next) {
  try {
    const u = await getAuthUserById(req.auth?.userId);
    if (!u) {
      return next(new AppError("AUTH_INVALID", "登录已失效，请重新登录。", 401));
    }
    req.authUser = u;
    req.auth.role = u.accountRole;
    req.auth.loginUsername = u.loginUsername;
    return next();
  } catch (err) {
    return next(err);
  }
}

function requireRole(...allowed) {
  const set = new Set(allowed);
  return (req, _res, next) => {
    const role = req.auth?.role;
    if (!role || !set.has(role)) {
      return next(new AppError("FORBIDDEN", "权限不足。", 403));
    }
    next();
  };
}

module.exports = {
  bearerToken,
  requireAuth,
  attachAuthUser,
  requireRole,
};
