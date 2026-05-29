const express = require("express");
const {
  evaluateDailyConsequences,
  getCurrentConsequences,
} = require("../../modules/consequence/consequenceService");
const { asyncHandler } = require("../../middleware/asyncHandler");

const router = express.Router();

router.get("/current", asyncHandler(async (req, res) => {
  const consequences = await getCurrentConsequences(req.auth.userId);
  res.json({ consequences });
}));

router.post("/evaluate", asyncHandler(async (req, res) => {
  const result = await evaluateDailyConsequences(req.auth.userId);
  res.json(result);
}));

module.exports = router;
