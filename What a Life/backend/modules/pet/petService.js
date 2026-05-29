const { prisma } = require("../../db/prisma");
const { AppError } = require("../../core/errors");
const { getItemDef, getDebuffSpec, listShopItems, PET_DEBUFF_SPECS } = require("./petCatalog");

const STAT_MIN = 0;
const STAT_MAX = 100;

function clampStat(n) {
  return Math.min(STAT_MAX, Math.max(STAT_MIN, Math.round(Number(n) || 0)));
}

function newId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function safeParseJson(raw, fallback = {}) {
  try {
    const v = JSON.parse(String(raw || "{}"));
    return v && typeof v === "object" ? v : fallback;
  } catch {
    return fallback;
  }
}

async function logPetEventTx(tx, { userId, eventType, triggerReason, effectJson = {} }) {
  await tx.eventRecord.create({
    data: {
      id: newId("ev"),
      userId,
      dailyTaskId: null,
      eventType: String(eventType || "pet_event").slice(0, 80),
      direction: "system",
      triggerReason: String(triggerReason || "").slice(0, 500),
      effectJson: JSON.stringify(effectJson && typeof effectJson === "object" ? effectJson : {}),
    },
  });
}

async function ensureUserPet(tx, userId) {
  await tx.userPet.upsert({
    where: { userId },
    create: {
      userId,
      displayName: "小伙伴",
      health: 78,
      cleanliness: 78,
      intelligence: 62,
      combatPower: 12,
      lastEventRollDate: "",
    },
    update: {},
  });
}

function patchPetStats(data, delta) {
  const d = delta || {};
  return {
    health: clampStat((data.health ?? 0) + (Number(d.health) || 0)),
    cleanliness: clampStat((data.cleanliness ?? 0) + (Number(d.cleanliness) || 0)),
    intelligence: clampStat((data.intelligence ?? 0) + (Number(d.intelligence) || 0)),
    combatPower: clampStat((data.combatPower ?? 0) + (Number(d.combatPower) || 0)),
  };
}

async function applyStatDeltaTx(tx, userId, delta) {
  const pet = await tx.userPet.findUnique({ where: { userId } });
  if (!pet) return;
  const next = patchPetStats(pet, delta);
  await tx.userPet.update({ where: { userId }, data: next });
}

async function applyIllnessPenaltiesTx(tx, userId) {
  const now = new Date();
  const rows = await tx.petDebuff.findMany({
    where: { userId, code: "illness", status: "active" },
  });
  const spec = getDebuffSpec("illness");
  const intMalus = spec?.permanentIntelligenceIfUntreated ?? -8;
  for (const d of rows) {
    if (!d.medicineDeadlineAt || d.medicineDeadlineAt > now) continue;
    const meta = safeParseJson(d.metaJson);
    if (meta.penaltyApplied) continue;
    const pet = await tx.userPet.findUnique({ where: { userId } });
    if (pet) {
      const nextInt = clampStat(pet.intelligence + intMalus);
      await tx.userPet.update({
        where: { userId },
        data: { intelligence: nextInt },
      });
    }
    await tx.petDebuff.update({
      where: { id: d.id },
      data: {
        status: "penalized",
        metaJson: JSON.stringify({ ...meta, penaltyApplied: true, penalizedAt: now.toISOString() }),
      },
    });
    await logPetEventTx(tx, {
      userId,
      eventType: "pet_illness_penalty",
      triggerReason: "生病超过 7 日未用药：智力已受到长期影响（已写入属性）。",
      effectJson: { debuffId: d.id, intelligenceDelta: intMalus },
    });
  }
}

async function applyDebuffTx(tx, userId, code) {
  const spec = getDebuffSpec(code);
  if (!spec) return;
  const medicineDeadlineAt =
    code === "illness"
      ? new Date(Date.now() + Math.max(1, spec.medicineGraceDays || 7) * 86400000)
      : null;
  const row = await tx.petDebuff.create({
    data: {
      id: newId("pd"),
      userId,
      code,
      status: "active",
      medicineDeadlineAt,
      metaJson: JSON.stringify({ rolledAt: new Date().toISOString() }),
    },
    select: { id: true, medicineDeadlineAt: true },
  });
  await applyStatDeltaTx(tx, userId, spec.statDelta || {});

  if (code === "illness") {
    await logPetEventTx(tx, {
      userId,
      eventType: "pet_illness",
      triggerReason: "小伙伴生病了：健康与清洁下降，请在 7 日内使用「宠物药剂」，否则智力可能永久降低。",
      effectJson: {
        debuffId: row.id,
        code: "illness",
        medicineDeadlineAt: row.medicineDeadlineAt ? row.medicineDeadlineAt.toISOString() : null,
      },
    });
  }
}

async function runDailyRandomDebuffsTx(tx, userId) {
  const today = new Date().toISOString().slice(0, 10);
  const pet = await tx.userPet.findUnique({ where: { userId } });
  if (!pet || pet.lastEventRollDate === today) return;

  const active = await tx.petDebuff.findMany({ where: { userId, status: "active" } });
  const activeCodes = new Set(active.map((a) => a.code));

  for (const code of Object.keys(PET_DEBUFF_SPECS)) {
    if (activeCodes.has(code)) continue;
    const spec = PET_DEBUFF_SPECS[code];
    const expected = Math.max(1, Number(spec.expectedIntervalDays) || 20);
    const p = 1 / expected;
    if (Math.random() >= p) continue;
    await applyDebuffTx(tx, userId, code);
    activeCodes.add(code);
  }

  await tx.userPet.update({
    where: { userId },
    data: { lastEventRollDate: today },
  });
}

async function syncPetLifecycleTx(tx, userId) {
  await ensureUserPet(tx, userId);
  await applyIllnessPenaltiesTx(tx, userId);
  await runDailyRandomDebuffsTx(tx, userId);
}

async function applyItemUseSideEffectsTx(tx, userId, itemCode, def) {
  const fx = def.useSideEffects;
  if (!fx) return;
  if (fx.always && typeof fx.always === "object") {
    await applyStatDeltaTx(tx, userId, fx.always);
    if (itemCode === "pet_training_dummy" && Object.keys(fx.always).length) {
      await logPetEventTx(tx, {
        userId,
        eventType: "pet_training_dirty",
        triggerReason: "使用训练木桩：练习弄脏毛发，清洁下降。",
        effectJson: { itemCode, delta: fx.always },
      });
    }
  }
  const rands = Array.isArray(fx.randomPenalties) ? fx.randomPenalties : [];
  for (const r of rands) {
    const prob = Math.min(1, Math.max(0, Number(r.probability) || 0));
    if (prob <= 0 || Math.random() >= prob) continue;
    await applyStatDeltaTx(tx, userId, r.delta || {});
    if (r.logReason) {
      await logPetEventTx(tx, {
        userId,
        eventType: "pet_item_side_effect",
        triggerReason: String(r.logReason),
        effectJson: { itemCode, delta: r.delta || {} },
      });
    }
  }
}

async function getPetSnapshot(userId) {
  const uid = String(userId || "").trim();
  if (!uid) {
    throw new AppError("USER_ID_REQUIRED", "缺少用户。", 400);
  }

  await prisma.$transaction(async (tx) => {
    await syncPetLifecycleTx(tx, uid);
  });

  const [pet, inventory, debuffs] = await Promise.all([
    prisma.userPet.findUnique({ where: { userId: uid } }),
    prisma.petInventory.findMany({ where: { userId: uid } }),
    prisma.petDebuff.findMany({
      where: { userId: uid, status: "active" },
      orderBy: { appliedAt: "desc" },
    }),
  ]);

  const catalog = listShopItems();
  const debuffsOut = debuffs.map((d) => {
    const spec = getDebuffSpec(d.code);
    return {
      id: d.id,
      code: d.code,
      label: spec?.label || d.code,
      hint: spec?.playerHint || "",
      appliedAt: d.appliedAt.toISOString(),
      medicineDeadlineAt: d.medicineDeadlineAt ? d.medicineDeadlineAt.toISOString() : null,
    };
  });

  const illnessRow = debuffs.find((d) => d.code === "illness");
  let petUrgentNotice = null;
  if (illnessRow) {
    const dl = illnessRow.medicineDeadlineAt
      ? illnessRow.medicineDeadlineAt.toISOString().slice(0, 16).replace("T", " ")
      : "—";
    petUrgentNotice = `小伙伴正在生病：请在 ${dl} 前使用「宠物药剂」。逾期未用药可能导致智力永久降低（已写入今日日志与事件记录）。`;
  }

  return {
    pet: pet
      ? {
          displayName: pet.displayName,
          health: pet.health,
          cleanliness: pet.cleanliness,
          intelligence: pet.intelligence,
          combatPower: pet.combatPower,
        }
      : null,
    inventory: inventory.map((r) => ({
      itemCode: r.itemCode,
      quantity: r.quantity,
    })),
    activeDebuffs: debuffsOut,
    catalog,
    petUrgentNotice,
  };
}

async function buyPetItem(userId, itemCodeRaw, qtyRaw) {
  const uid = String(userId || "").trim();
  const itemCode = String(itemCodeRaw || "").trim();
  const qty = Math.min(20, Math.max(1, Math.round(Number(qtyRaw) || 1)));
  const def = getItemDef(itemCode);
  if (!def) {
    throw new AppError("PET_ITEM_UNKNOWN", "未找到该宠物用品。", 400);
  }
  const totalCost = def.coinCost * qty;

  return prisma.$transaction(async (tx) => {
    await ensureUserPet(tx, uid);
    const wallet = await tx.wallet.findUnique({ where: { userId: uid } });
    if (!wallet || wallet.coinBalance < totalCost) {
      throw new AppError("INSUFFICIENT_COIN", "代币不足。", 400);
    }

    await tx.wallet.update({
      where: { userId: uid },
      data: { coinBalance: { decrement: totalCost } },
    });

    const existing = await tx.petInventory.findUnique({
      where: { userId_itemCode: { userId: uid, itemCode } },
    });
    if (existing) {
      await tx.petInventory.update({
        where: { id: existing.id },
        data: { quantity: { increment: qty } },
      });
    } else {
      await tx.petInventory.create({
        data: {
          id: newId("pinv"),
          userId: uid,
          itemCode,
          quantity: qty,
        },
      });
    }

    const snap = await tx.wallet.findUnique({ where: { userId: uid } });
    return { ok: true, coinBalance: snap?.coinBalance ?? 0, itemCode, quantityAdded: qty };
  });
}

async function usePetItem(userId, itemCodeRaw) {
  const uid = String(userId || "").trim();
  const itemCode = String(itemCodeRaw || "").trim();
  const def = getItemDef(itemCode);
  if (!def) {
    throw new AppError("PET_ITEM_UNKNOWN", "未找到该宠物用品。", 400);
  }
  return prisma.$transaction(async (tx) => {
    await syncPetLifecycleTx(tx, uid);
    const row = await tx.petInventory.findUnique({
      where: { userId_itemCode: { userId: uid, itemCode } },
    });
    if (!row || row.quantity < 1) {
      throw new AppError("PET_INVENTORY_EMPTY", "背包里没有该物品。", 400);
    }

    await tx.petInventory.update({
      where: { id: row.id },
      data: { quantity: { decrement: 1 } },
    });
    const afterInv = await tx.petInventory.findUnique({ where: { id: row.id } });
    if (afterInv && afterInv.quantity <= 0) {
      await tx.petInventory.delete({ where: { id: row.id } });
    }

    await applyStatDeltaTx(tx, uid, def.deltas || {});

    const clearCodes = def.clearsDebuffCodes || [];
    if (clearCodes.length) {
      await tx.petDebuff.updateMany({
        where: {
          userId: uid,
          status: "active",
          code: { in: clearCodes },
        },
        data: { status: "cleared" },
      });
    }

    await applyItemUseSideEffectsTx(tx, uid, itemCode, def);

    const pet = await tx.userPet.findUnique({ where: { userId: uid } });
    return {
      ok: true,
      pet: pet
        ? {
            displayName: pet.displayName,
            health: pet.health,
            cleanliness: pet.cleanliness,
            intelligence: pet.intelligence,
            combatPower: pet.combatPower,
          }
        : null,
    };
  });
}

module.exports = {
  getPetSnapshot,
  buyPetItem,
  usePetItem,
};
