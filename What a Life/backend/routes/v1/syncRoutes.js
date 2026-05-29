const express = require("express");
const { getSyncStatus } = require("../../modules/sync/syncService");
const { asyncHandler } = require("../../middleware/asyncHandler");

const router = express.Router();

router.get("/status", asyncHandler(async (req, res) => {
  const status = await getSyncStatus(req.auth.userId);
  res.json(status);
}));

module.exports = router;
