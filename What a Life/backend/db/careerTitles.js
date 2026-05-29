/**
 * 每个职业三条「现实向」生涯阶段 × 每阶段 6 档职称（共 18 级 / 职业）。
 * 阶段：1 探索期（入门执行）2 进阶期（独立负责）3 冲刺期（专家与影响面）
 */

const STAGE_LABELS = ["探索期", "进阶期", "冲刺期"];

/** @type {Record<string, Record<1|2|3, string[]>>} */
const GRID = {
  doctor: {
    1: ["见习健康助理", "社区随访练习生", "基础体征记录员", "健康宣教志愿者", "运动打卡督导员", "睡眠卫生执行专员"],
    2: ["慢病管理协调员", "个案健康规划师", "身心复健训练师", "门诊流程优化助理", "患者教育主讲助理", "质控与文书专员"],
    3: ["主治级协理专家", "多学科会诊协调人", "临床路径改进顾问", "患者安全与风险管理顾问", "健康项目带头人", "机构级健康战略顾问"],
  },
  engineer: {
    1: ["备考旁听生", "章节精读练习生", "错题整理专员", "限时模考执行员", "知识卡片整理员", "日计划复盘助理"],
    2: ["模块攻坚负责人", "真题套卷分析员", "薄弱专题组长", "学习节奏调度员", "跨科目平衡协调员", "阶段性目标推进官"],
    3: ["全真冲刺总协调", "高分策略定制顾问", "考场心态与体能教练（学习向）", "知识体系总架构师", "押题与风险对冲顾问", "备考团队精神领队"],
  },
  coach: {
    1: ["习惯观察记录员", "晨起仪式执行员", "番茄钟陪练助理", "拖延预警练习生", "周计划拆解助理", "执行反馈记录员"],
    2: ["个人效能教练（初级）", "行为契约见证人", "中断恢复训练师", "专注力陪练组长", "周复盘引导员", "问责与激励协调员"],
    3: ["高绩效习惯总教练", "组织节奏顾问（个人版）", "深度工作训练营教官", "压力与恢复平衡顾问", "长期目标守门人", "生涯执行系统架构师"],
  },
  researcher: {
    1: ["文献精读练习生", "概念对比记录员", "方法笔记整理员", "小实验设计助理", "复述录音练习生", "假设检验记录员"],
    2: ["独立 mini 研究负责人", "证据等级评估员", "认知偏差扫描员", "策略 A/B 实验员", "跨领域类比调研员", "阶段性综述撰写人"],
    3: ["研究问题定义顾问", "方法论导师级研究员", "知识图谱总编", "学术写作与表达教练", "创新实验总设计师", "认知升级体系架构师"],
  },
  programmer: {
    1: ["代码仓练习生", "需求澄清记录员", "单元测试编写助理", "接口联调练习生", "Code Review 旁听员", "技术笔记整理员"],
    2: ["模块负责人（开发）", "线上缺陷攻坚手", "性能与可观测性专员", "技术方案撰写人", "跨团队接口协调员", "发布与回滚值班长"],
    3: ["子系统技术负责人", "架构演进顾问", "平台稳定性专家", "工程效能改进顾问", "技术布道与导师", "首席工程师预备岗"],
  },
  psychologist: {
    1: ["倾听与共情练习生", "情绪日记引导员", "认知重构记录助理", "放松训练带领员", "心理量表施测助理", "会谈纪要整理员"],
    2: ["个体咨询协谈师", "团体辅导助理带领", "危机干预联络员", "家庭沟通调解练习生", "督导案例报告员", "伦理与边界守门助理"],
    3: ["注册心理师（预备督导）", "督导级咨询师", "员工援助计划顾问", "创伤知情实践专家", "组织心理安全顾问", "临床心理学科带头人助理"],
  },
  financier: {
    1: ["财务数据录入员", "对账与凭证整理员", "现金流监控助理", "预算执行记录员", "费用合规初审员", "报表练习生"],
    2: ["财务分析专员", "资金计划协调员", "投融资材料撰写人", "风险指标监控员", "税务与合规联络员", "项目财务负责人"],
    3: ["财务BP（业务伙伴）", "资本运作顾问", "内控与审计对接专家", "CFO 办公室战略分析官", "并购尽调负责人", "首席财务官预备岗"],
  },
  mentor: {
    1: ["一对一陪练助理", "目标拆解记录员", "反馈纪要整理员", "作业批改练习生", "学习动机观察员", "家长沟通记录员"],
    2: ["学科辅导主讲（初级）", "弱科补强计划师", "模考讲评专员", "时间管理教练", "考前心理调适助理", "升学路径规划助理"],
    3: ["升学总规划顾问", "竞赛与综评策略专家", "家庭学业治理顾问", "长期陪伴导师", "多子女家庭调度顾问", "首席升学战略官"],
  },
};

function levelOrderFromStageTier(stage, tier) {
  return (stage - 1) * 6 + tier;
}

function buildCareerNodesForSeed() {
  const out = [];
  for (const [professionRoleCode, stages] of Object.entries(GRID)) {
    for (let stage = 1; stage <= 3; stage += 1) {
      const titles = stages[stage];
      if (!titles || titles.length !== 6) {
        throw new Error(`careerTitles: ${professionRoleCode} stage ${stage} must have 6 titles`);
      }
      for (let tier = 1; tier <= 6; tier += 1) {
        const levelOrder = levelOrderFromStageTier(stage, tier);
        const id = `career_${professionRoleCode}_${levelOrder}`;
        out.push({
          id,
          professionRoleCode,
          careerStage: stage,
          tierInStage: tier,
          levelOrder,
          title: titles[tier - 1],
          unlockRuleJson: JSON.stringify({
            cycle: "monthly",
            /** 晋升门槛由运行时按用户 dailyWorkloadTarget 与阶段计算；此处为文档性系数 */
            workloadFactor: 5.5 + stage * 0.8 + tier * 0.15,
            minMandatoryMainline: true,
            complexScore: "difficulty_squared",
          }),
          rewardJson: JSON.stringify({ coin: 30 * levelOrder, exp: 40 * levelOrder }),
        });
      }
    }
  }
  return out;
}

function getStageLabel(stage) {
  return STAGE_LABELS[Math.max(1, Math.min(3, stage)) - 1] || "探索期";
}

function titleForLevel(professionRoleCode, levelOrder) {
  const grid = GRID[professionRoleCode];
  if (!grid) return `Lv.${levelOrder}`;
  const stage = Math.floor((levelOrder - 1) / 6) + 1;
  const tier = ((levelOrder - 1) % 6) + 1;
  const row = grid[stage];
  if (!row) return `Lv.${levelOrder}`;
  return row[tier - 1] || `Lv.${levelOrder}`;
}

module.exports = {
  GRID,
  STAGE_LABELS,
  buildCareerNodesForSeed,
  levelOrderFromStageTier,
  getStageLabel,
  titleForLevel,
};
