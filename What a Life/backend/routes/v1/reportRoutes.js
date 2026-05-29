const express = require("express");
const {
  getWeeklyReport,
  upsertWeeklyReview,
  getWeeklyReview,
} = require("../../modules/review/reviewService");
const { asyncHandler } = require("../../middleware/asyncHandler");

const router = express.Router();

router.get("/weekly", asyncHandler(async (req, res) => {
  const report = await getWeeklyReport(req.auth.userId);
  res.json(report);
}));

router.get("/weekly-review/:weekKey", asyncHandler(async (req, res) => {
  const review = await getWeeklyReview(req.auth.userId, req.params.weekKey);
  res.json({ review });
}));

router.post("/weekly-review", asyncHandler(async (req, res) => {
  const review = await upsertWeeklyReview(req.auth.userId, req.body || {});
  res.json({ review });
}));

module.exports = router;
