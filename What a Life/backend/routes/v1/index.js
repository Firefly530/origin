const express = require("express");
const { asyncHandler } = require("../../middleware/asyncHandler");
const { requireAuth } = require("../../middleware/requireAuth");
const { getAuthUserById } = require("../../modules/auth/authService");
const { completeOnboarding, updatePlayerProfile } = require("../../modules/auth/onboardingService");
const { resetUserGameProgress } = require("../../modules/progress/progressResetService");
const { AppError } = require("../../core/errors");

const authRoutes = require("./authRoutes");
const adminRoutes = require("./adminRoutes");
const chatRoutes = require("./chatRoutes");
const taskRoutes = require("./taskRoutes");
const rewardRoutes = require("./rewardRoutes");
const logRoutes = require("./logRoutes");
const consequenceRoutes = require("./consequenceRoutes");
const professionRoutes = require("./professionRoutes");
const reportRoutes = require("./reportRoutes");
const syncRoutes = require("./syncRoutes");
const dashboardRoutes = require("./dashboardRoutes");
const petRoutes = require("./petRoutes");

const router = express.Router();

router.use("/auth", authRoutes);

router.use(requireAuth);

router.get(
  "/auth/me",
  asyncHandler(async (req, res) => {
    const u = await getAuthUserById(req.auth.userId);
    if (!u) {
      return res.status(401).json({ errorCode: "AUTH_INVALID", message: "登录已失效。" });
    }
    res.json({ user: u });
  }),
);

router.patch(
  "/auth/me",
  asyncHandler(async (req, res) => {
    const user = await updatePlayerProfile(req.auth.userId, req.body || {});
    res.json({
      user: {
        id: user.id,
        loginUsername: user.loginUsername,
        displayName: user.displayName,
        accountRole: user.accountRole,
        dailyBudgetCents: user.dailyBudgetCents,
        dailyWorkloadTarget: user.dailyWorkloadTarget,
        onboardingStep: user.onboardingStep,
        identityRoleCode: user.identityRoleCode,
      },
    });
  }),
);

router.post(
  "/auth/onboarding",
  asyncHandler(async (req, res) => {
    const result = await completeOnboarding(req.auth.userId, req.body || {});
    res.json(result);
  }),
);

/** 清空局内进度（任务、代币、兑换、宠物、后果、里程碑收藏等），保留账号与预算设置 */
router.post(
  "/auth/reset-progress",
  asyncHandler(async (req, res) => {
    const phrase = String(req.body?.confirmPhrase ?? req.body?.confirm ?? "").trim();
    if (phrase !== "我确认重置") {
      throw new AppError("RESET_CONFIRM_REQUIRED", "请在确认框中输入「我确认重置」后再提交。", 400);
    }
    await resetUserGameProgress(req.auth.userId);
    res.json({ ok: true, message: "进度已重置。" });
  }),
);

router.use("/admin", adminRoutes);
router.use("/chat", chatRoutes);
router.use("/tasks", taskRoutes);
router.use("/rewards", rewardRoutes);
router.use("/logs", logRoutes);
router.use("/consequences", consequenceRoutes);
router.use("/professions", professionRoutes);
router.use("/reports", reportRoutes);
router.use("/sync", syncRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/pet", petRoutes);

module.exports = router;
