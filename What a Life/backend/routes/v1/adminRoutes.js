const express = require("express");
const { asyncHandler } = require("../../middleware/asyncHandler");
const { requireRole } = require("../../middleware/requireAuth");
const { listUsers, createUserByRoot, deleteUserByRoot, updateUserByRoot } = require("../../modules/admin/adminUserService");

const router = express.Router();

router.get("/users", requireRole("root", "developer"), asyncHandler(async (_req, res) => {
  const users = await listUsers();
  res.json({ users });
}));

router.post("/users", requireRole("root"), asyncHandler(async (req, res) => {
  const user = await createUserByRoot(req.body || {});
  res.status(201).json({ user });
}));

router.patch("/users/:id", requireRole("root"), asyncHandler(async (req, res) => {
  const user = await updateUserByRoot(req.params.id, req.body || {});
  res.json({ user });
}));

router.delete("/users/:id", requireRole("root"), asyncHandler(async (req, res) => {
  const result = await deleteUserByRoot(req.params.id, req.auth.userId);
  res.json(result);
}));

module.exports = router;
