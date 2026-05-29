const { prisma } = require("../../db/prisma");
const { AppError } = require("../../core/errors");

async function enqueueSyncEvent(userId, aggregateType, aggregateId, operationType, payload) {
  if (!aggregateType || !aggregateId || !operationType) {
    throw new AppError(
      "SYNC_EVENT_INVALID",
      "aggregateType, aggregateId and operationType are required.",
      400,
    );
  }
  return prisma.syncEvent.create({
    data: {
      id: `sync_${Date.now()}`,
      userId,
      aggregateType,
      aggregateId,
      operationType,
      payloadJson: JSON.stringify(payload || {}),
      status: "pending",
    },
  });
}

async function getSyncStatus(userId) {
  const [pending, success, total] = await Promise.all([
    prisma.syncEvent.count({ where: { userId, status: "pending" } }),
    prisma.syncEvent.count({ where: { userId, status: "synced" } }),
    prisma.syncEvent.count({ where: { userId } }),
  ]);
  if ([pending, success, total].some((n) => typeof n !== "number")) {
    throw new AppError("SYNC_STATUS_READ_FAILED", "Failed to compute sync status.", 500);
  }
  return { pending, success, total };
}

module.exports = {
  enqueueSyncEvent,
  getSyncStatus,
};
