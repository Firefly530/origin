const express = require("express");
const { asyncHandler } = require("../../middleware/asyncHandler");
const {
  loginWithUsernamePassword,
  registerPlayerUser,
  validateRegistrationFields,
  normalizeLoginUsername,
} = require("../../modules/auth/authService");
const { prisma } = require("../../db/prisma");

const router = express.Router();

router.post("/login", asyncHandler(async (req, res) => {
  const loginUsername = req.body?.loginUsername ?? req.body?.username ?? req.body?.user;
  const password = req.body?.password;
  const result = await loginWithUsernamePassword(loginUsername, password);
  res.json(result);
}));

/** 注册前校验（用户名格式、密码长度、是否已被占用） */
router.post("/validate-registration", asyncHandler(async (req, res) => {
  const loginUsername = req.body?.loginUsername;
  const password = req.body?.password;
  const { ok, errors } = validateRegistrationFields(loginUsername, password);
  const out = { ok, errors: { ...errors } };
  if (!ok) {
    return res.json(out);
  }
  const name = normalizeLoginUsername(loginUsername);
  const existing = await prisma.user.findFirst({ where: { loginUsername: name } });
  if (existing) {
    out.ok = false;
    out.errors.loginUsername = "该用户名已被注册。";
  }
  return res.json(out);
}));

/** 公开自助注册（玩家）；新用户出现在 root 的用户列表中 */
router.post("/register", asyncHandler(async (req, res) => {
  const result = await registerPlayerUser(req.body || {});
  res.status(201).json(result);
}));

module.exports = router;
