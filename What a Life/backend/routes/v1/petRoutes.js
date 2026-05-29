const express = require("express");
const { asyncHandler } = require("../../middleware/asyncHandler");
const { getPetSnapshot, buyPetItem, usePetItem } = require("../../modules/pet/petService");

const router = express.Router();

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const data = await getPetSnapshot(req.auth.userId);
    res.json(data);
  }),
);

router.post(
  "/shop/buy",
  asyncHandler(async (req, res) => {
    const { itemCode, quantity } = req.body || {};
    const result = await buyPetItem(req.auth.userId, itemCode, quantity);
    res.json(result);
  }),
);

router.post(
  "/inventory/use",
  asyncHandler(async (req, res) => {
    const { itemCode } = req.body || {};
    const result = await usePetItem(req.auth.userId, itemCode);
    res.json(result);
  }),
);

module.exports = router;
