const express = require("express");
const { asyncHandler } = require("../../middleware/asyncHandler");
const { getSummary } = require("../../modules/dashboard/dashboardService");

const router = express.Router();

router.get("/summary", asyncHandler(async (req, res) => {
  const summary = await getSummary(req.auth.userId);
  res.json(summary);
}));

module.exports = router;
