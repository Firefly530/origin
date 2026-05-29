const store = {
  user: {
    id: "local-user",
    displayName: "Local Player",
    dailyBudgetCents: 25000,
  },
  wallet: {
    coinBalance: 1200,
    energy: 100,
    reputation: 0,
  },
  weeklyPlan: {
    weekKey: "2026-W18",
    role: "engineer",
    changedCount: 0,
  },
  tasks: [
    {
      id: "t1",
      title: "数学专题训练 90 分钟",
      sourceType: "mandatory",
      status: "pending",
      rewardCoin: 120,
      taskDate: new Date().toISOString().slice(0, 10),
    },
    {
      id: "t2",
      title: "英语精读 1 篇",
      sourceType: "mandatory",
      status: "pending",
      rewardCoin: 120,
      taskDate: new Date().toISOString().slice(0, 10),
    },
    {
      id: "t3",
      title: "错题整理 20 分钟",
      sourceType: "mandatory",
      status: "pending",
      rewardCoin: 60,
      taskDate: new Date().toISOString().slice(0, 10),
    },
  ],
  rewardCatalog: [
    { id: "r1", title: "TIER_SLOT_S", tier: "S", coinCost: 150, budgetCostCents: 1800, dailyLimit: 3 },
    { id: "r2", title: "TIER_SLOT_C", tier: "C", coinCost: 700, budgetCostCents: 12000, dailyLimit: 1 },
  ],
  redemptionRecords: [],
  consequences: [],
  syncEvents: [],
};

module.exports = { store };
