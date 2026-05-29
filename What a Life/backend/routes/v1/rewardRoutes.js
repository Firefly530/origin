const express = require("express");
const {
  getRewardCatalogForUser,
  createReward,
  updateReward,
  deleteReward,
  redeemReward,
} = require("../../modules/reward/rewardService");
const { listSelfRewards, recordSelfReward, deleteSelfReward } = require("../../modules/reward/selfRewardService");
const { asyncHandler } = require("../../middleware/asyncHandler");
const { requireRole } = require("../../middleware/requireAuth");
const { enqueueSyncEvent } = require("../../modules/sync/syncService");

const router = express.Router();
const rootOnly = requireRole("root");

/** 旧版目录（仅管理员维护种子/测试）；玩家端已改为自行记录奖励 */
router.get("/catalog", asyncHandler(async (req, res) => {
  const rewards = await getRewardCatalogForUser(req.auth.userId);
  res.json({ rewards });
}));

router.get("/self", asyncHandler(async (req, res) => {
  const data = await listSelfRewards(req.auth.userId, req.query?.date);
  res.json(data);
}));

router.post("/self", asyncHandler(async (req, res) => {
  const result = await recordSelfReward(req.auth.userId, req.body || {});
  await enqueueSyncEvent(req.auth.userId, "daily_self_rewards", result.reward.id, "insert", result.reward);
  res.status(201).json(result);
}));

router.delete("/self/:id", asyncHandler(async (req, res) => {
  const result = await deleteSelfReward(req.auth.userId, req.params.id);
  await enqueueSyncEvent(req.auth.userId, "daily_self_rewards", req.params.id, "delete", result);
  res.json(result);
}));

router.post("/", rootOnly, asyncHandler(async (req, res) => {
  const reward = await createReward(req.body || {});
  await enqueueSyncEvent(req.auth.userId, "reward_catalog", reward.id, "insert", reward);
  res.status(201).json({ reward });
}));

router.patch("/:id", rootOnly, asyncHandler(async (req, res) => {
  const reward = await updateReward(req.params.id, req.body || {});
  await enqueueSyncEvent(req.auth.userId, "reward_catalog", reward.id, "update", reward);
  res.json({ reward });
}));

router.delete("/:id", rootOnly, asyncHandler(async (req, res) => {
  const result = await deleteReward(req.params.id);
  await enqueueSyncEvent(req.auth.userId, "reward_catalog", req.params.id, "delete", result);
  res.json(result);
}));

/** 旧版「从目录兑换」；玩家主路径为 POST /self */
router.post("/redeem", asyncHandler(async (req, res) => {
  const result = await redeemReward(req.auth.userId, req.body?.rewardId);
  await enqueueSyncEvent(req.auth.userId, "redemption_records", result.record.id, "insert", result.record);
  return res.json(result);
}));

module.exports = router;
