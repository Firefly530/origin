/**
 * 宠物用品目录：代币购买；使用时可多属性加减、清除 debuff。
 * useSideEffects：使用主效果后的额外影响（如训练弄脏、随机轻微受伤）。
 */

const PET_ITEM_CATALOG = {
  pet_food: {
    title: "营养口粮",
    description: "恢复健康，缓解过度疲劳。",
    coinCost: 45,
    deltas: { health: 10 },
    clearsDebuffCodes: ["fatigue"],
  },
  pet_shampoo: {
    title: "香波洗护",
    description: "大幅提升清洁，去除打结、瘙痒、体外寄生虫困扰。",
    coinCost: 44,
    deltas: { cleanliness: 14 },
    clearsDebuffCodes: ["messy_coat", "itchy_skin", "parasite_bite"],
  },
  pet_toy: {
    title: "智力玩具",
    description: "陪玩提升智力，驱散闷闷不乐。",
    coinCost: 55,
    deltas: { intelligence: 10 },
    clearsDebuffCodes: ["boredom"],
  },
  pet_medicine: {
    title: "宠物药剂",
    description: "治疗生病、受凉与肠胃不适；生病类须在期限内使用以免智力永久伤损。",
    coinCost: 92,
    deltas: { health: 8, intelligence: 2 },
    clearsDebuffCodes: ["illness", "mild_cold", "digestive_upset"],
  },
  pet_snack: {
    title: "安抚零食",
    description: "小幅恢复，缓解压力掉毛带来的烦躁。",
    coinCost: 36,
    deltas: { health: 6, intelligence: 4 },
    clearsDebuffCodes: ["stress_shadow"],
  },
  pet_training_dummy: {
    title: "训练木桩",
    description: "提升战斗力；训练会弄脏毛发，偶尔练过头会略伤健康。",
    coinCost: 72,
    deltas: { combatPower: 8 },
    clearsDebuffCodes: [],
    useSideEffects: {
      always: { cleanliness: -8 },
      randomPenalties: [{ probability: 0.32, delta: { health: -5 }, logReason: "训练过度，健康小幅下降" }],
    },
  },
  pet_deluxe_meal: {
    title: "豪华营养餐",
    description: "一口补多项：健康、清洁、智力小幅齐升。",
    coinCost: 98,
    deltas: { health: 12, cleanliness: 8, intelligence: 5 },
    clearsDebuffCodes: [],
  },
  pet_grooming_kit: {
    title: "洗护套装",
    description: "洗澡+护理，清洁与健康双升，附带让心情更稳一点。",
    coinCost: 86,
    deltas: { cleanliness: 12, health: 6, intelligence: 3 },
    clearsDebuffCodes: [],
  },
  pet_brain_combo: {
    title: "健脑套餐",
    description: "益智口粮：智力与健康双通道。",
    coinCost: 72,
    deltas: { intelligence: 12, health: 7 },
    clearsDebuffCodes: [],
  },
  pet_dewormer: {
    title: "驱虫滴剂",
    description: "针对体外寄生虫；清洁与健康一并照顾。",
    coinCost: 58,
    deltas: { health: 5, cleanliness: 6 },
    clearsDebuffCodes: ["parasite_bite"],
  },
  pet_rest_bed: {
    title: "舒适小窝垫",
    description: "休息恢复：健康、战斗力与清洁略升。",
    coinCost: 68,
    deltas: { health: 8, combatPower: 4, cleanliness: 4 },
    clearsDebuffCodes: [],
  },
};

/** 随机 debuff：expectedIntervalDays → 每日独立概率 p=1/E */
const PET_DEBUFF_SPECS = {
  illness: {
    label: "生病",
    expectedIntervalDays: 30,
    statDelta: { health: -12, cleanliness: -8 },
    medicineGraceDays: 7,
    permanentIntelligenceIfUntreated: -8,
    playerHint: "健康、清洁下降；请在 7 日内使用「宠物药剂」，否则智力可能永久降低。",
  },
  messy_coat: {
    label: "毛发打结",
    expectedIntervalDays: 16,
    statDelta: { cleanliness: -16 },
    playerHint: "清洁大幅下降；使用「香波洗护」可清除。",
  },
  boredom: {
    label: "闷闷不乐",
    expectedIntervalDays: 12,
    statDelta: { intelligence: -7 },
    playerHint: "智力受影响；用「智力玩具」陪玩可清除。",
  },
  fatigue: {
    label: "过度疲劳",
    expectedIntervalDays: 22,
    statDelta: { health: -9, combatPower: -6 },
    playerHint: "健康与战斗力下降；喂食「营养口粮」可清除。",
  },
  stress_shadow: {
    label: "压力掉毛",
    expectedIntervalDays: 26,
    statDelta: { cleanliness: -10, intelligence: -4 },
    playerHint: "清洁与智力略降；「安抚零食」可清除。",
  },
  mild_cold: {
    label: "受凉",
    expectedIntervalDays: 24,
    statDelta: { health: -8, intelligence: -3 },
    playerHint: "轻微感冒症状；用「宠物药剂」可清除。",
  },
  digestive_upset: {
    label: "肠胃不适",
    expectedIntervalDays: 28,
    statDelta: { health: -7, cleanliness: -5 },
    playerHint: "消化不好连带精神差；「宠物药剂」可帮助恢复。",
  },
  itchy_skin: {
    label: "皮肤瘙痒",
    expectedIntervalDays: 18,
    statDelta: { cleanliness: -12, health: -3 },
    playerHint: "清洁与健康略受影响；香波洗护可缓解。",
  },
  parasite_bite: {
    label: "体外寄生虫",
    expectedIntervalDays: 32,
    statDelta: { health: -6, cleanliness: -8 },
    playerHint: "驱虫滴剂或深度洗护（香波）可处理。",
  },
};

function listShopItems() {
  return Object.entries(PET_ITEM_CATALOG).map(([code, v]) => ({
    code,
    title: v.title,
    description: v.description,
    coinCost: v.coinCost,
  }));
}

function getItemDef(code) {
  return PET_ITEM_CATALOG[String(code || "").trim()] || null;
}

function getDebuffSpec(code) {
  return PET_DEBUFF_SPECS[String(code || "").trim()] || null;
}

module.exports = {
  PET_ITEM_CATALOG,
  PET_DEBUFF_SPECS,
  listShopItems,
  getItemDef,
  getDebuffSpec,
};
