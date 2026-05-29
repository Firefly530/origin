/**
 * 单笔奖励占「日可支配预算」的万分比 → 应扣除的游戏代币（梯度：占比越高扣得越多）。
 * @param {number} budgetPercentBps 1..10000（10000 = 100%）
 */
function coinCostForBudgetShareBps(budgetPercentBps) {
  const p = Math.min(10000, Math.max(1, Math.round(Number(budgetPercentBps) || 0)));
  const bands = [
    { max: 400, coin: 40 },
    { max: 800, coin: 75 },
    { max: 1200, coin: 110 },
    { max: 2000, coin: 170 },
    { max: 3000, coin: 240 },
    { max: 4500, coin: 330 },
    { max: 6000, coin: 430 },
    { max: 7500, coin: 540 },
    { max: 9000, coin: 660 },
    { max: 10000, coin: 800 },
  ];
  for (const b of bands) {
    if (p <= b.max) return b.coin;
  }
  return 800;
}

module.exports = { coinCostForBudgetShareBps };
