const express = require("express");
const {
  getRoles,
  getWeeklyPlan,
  setWeeklyPlan,
} = require("../../modules/profession/professionService");
const { asyncHandler } = require("../../middleware/asyncHandler");

const router = express.Router();

router.get("/roles", asyncHandler(async (_req, res) => {
  const roles = await getRoles();
  res.json({ roles });
}));

router.get("/weekly-plan", asyncHandler(async (req, res) => {
  const plan = await getWeeklyPlan(req.auth.userId);
  res.json({ plan });
}));

router.post("/weekly-plan", asyncHandler(async (req, res) => {
  const result = await setWeeklyPlan(req.auth.userId, req.body || {});
  return res.json({ plan: result });
}));

module.exports = router;
