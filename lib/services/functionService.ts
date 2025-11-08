/**
 * 函数信息定义（业务视角）
 */
export interface FunctionInfo {
  name: string;
  title: string;
  category: 'business' | 'query' | 'ai' | 'maintenance';
  summary: string; // 一句话说明
  purpose: string; // 解决什么问题
  useCases: string[]; // 使用场景
  usedIn: string[]; // 在哪里用到
  requiredInfo?: string[]; // 需要提供的信息（可选）
}

/**
 * 所有函数的业务化描述
 */
export const FUNCTIONS_CATALOG: FunctionInfo[] = [
  // ========== 业务核心函数 ==========
  {
    name: 'upsert_transaction',
    title: '创建/更新账单记录',
    category: 'business',
    summary: '保存你的每一笔收支记录到数据库',
    purpose: '让你能记录每一笔收入或支出，并支持事后修改',
    useCases: [
      '在添加账单页面填写表单后保存',
      '修改已有的账单信息',
      '批量导入账单数据'
    ],
    usedIn: [
      '添加账单页面 (/add)',
      '账单编辑功能',
      '批量导入功能'
    ],
    requiredInfo: [
      '收入还是支出',
      '金额',
      '类别（如"餐饮"）',
      '日期',
      '币种'
    ]
  },
  {
    name: 'generate_recurring_transactions',
    title: '生成固定支出账单',
    category: 'business',
    summary: '自动为你生成房租、水电等固定账单',
    purpose: '解放双手，不用每月手动重复添加固定支出',
    useCases: [
      '每月初自动检查并生成到期的固定账单',
      '手动触发生成本月的固定支出'
    ],
    usedIn: [
      '定时任务：每天 00:01 自动运行',
      '固定支出管理页面的"手动生成"按钮'
    ]
  },
  {
    name: 'add_custom_category',
    title: '添加自定义类别',
    category: 'business',
    summary: '创建属于你自己的消费类别',
    purpose: '当系统默认类别不够用时，自定义更符合你习惯的分类',
    useCases: [
      '添加特殊的消费类别（如"宠物支出"）',
      '为特定项目创建专属类别'
    ],
    usedIn: [
      '设置 → 消费配置 → 类别自定义'
    ],
    requiredInfo: [
      '类别名称',
      '图标（emoji）',
      '颜色',
      '收入还是支出类别'
    ]
  },
  {
    name: 'update_category',
    title: '更新类别信息',
    category: 'business',
    summary: '修改已有类别的名称、图标、颜色等',
    purpose: '调整类别设置，让分类体系更符合你的需求',
    useCases: [
      '修改类别的显示名称',
      '更换类别图标',
      '调整类别排序'
    ],
    usedIn: [
      '类别管理页面的编辑功能'
    ]
  },
  {
    name: 'delete_category',
    title: '删除类别',
    category: 'business',
    summary: '删除不需要的类别，并自动迁移相关账单',
    purpose: '整理类别列表，删除时会把使用该类别的账单迁移到其他类别',
    useCases: [
      '删除不再使用的类别',
      '合并重复的类别'
    ],
    usedIn: [
      '类别管理页面的删除功能'
    ]
  },
  {
    name: 'add_payment_method',
    title: '添加支付方式',
    category: 'business',
    summary: '记录你的各种支付账户（微信、支付宝、银行卡等）',
    purpose: '追踪不同支付方式的使用情况，了解资金流向',
    useCases: [
      '添加新的信用卡',
      '记录电子钱包账户',
      '添加现金支付选项'
    ],
    usedIn: [
      '设置 → 消费配置 → 支付方式管理'
    ],
    requiredInfo: [
      '支付方式名称（如"招商银行信用卡"）',
      '类型（信用卡/借记卡/电子钱包/现金）',
      '图标和颜色（可选）'
    ]
  },
  {
    name: 'update_payment_method',
    title: '更新支付方式',
    category: 'business',
    summary: '修改支付方式的名称、图标等信息',
    purpose: '调整支付方式的显示和分类',
    useCases: [
      '更新信用卡的别名',
      '修改支付方式图标'
    ],
    usedIn: [
      '支付方式管理页面'
    ]
  },
  {
    name: 'delete_payment_method',
    title: '删除支付方式',
    category: 'business',
    summary: '删除不用的支付方式，并自动迁移交易记录',
    purpose: '清理支付方式列表，删除时会把相关交易迁移到其他支付方式',
    useCases: [
      '删除已注销的信用卡',
      '移除不再使用的支付账户'
    ],
    usedIn: [
      '支付方式管理页面'
    ]
  },
  {
    name: 'set_default_payment_method',
    title: '设置默认支付方式',
    category: 'business',
    summary: '标记常用的支付方式为默认',
    purpose: '添加账单时自动选中你最常用的支付方式',
    useCases: [
      '设置微信支付为默认',
      '切换默认支付方式'
    ],
    usedIn: [
      '支付方式管理页面'
    ]
  },
  {
    name: 'set_budget',
    title: '设置月度预算',
    category: 'business',
    summary: '为每个类别设置月度开支上限',
    purpose: '帮助你控制某类消费，避免超支',
    useCases: [
      '设置餐饮预算不超过3000元',
      '为娱乐消费设定上限',
      '调整已有的预算额度'
    ],
    usedIn: [
      '设置 → 消费配置 → 月度预算'
    ],
    requiredInfo: [
      '年份和月份',
      '类别',
      '预算金额',
      '预警阈值（可选，默认80%）'
    ]
  },
  {
    name: 'delete_budget',
    title: '删除预算',
    category: 'business',
    summary: '取消某个类别的预算限制',
    purpose: '不再对某类消费进行预算控制',
    useCases: [
      '取消本月某类别的预算',
      '清理历史预算数据'
    ],
    usedIn: [
      '预算管理页面'
    ]
  },

  // ========== 查询统计函数 ==========
  {
    name: 'get_categories_with_stats',
    title: '查看类别使用情况',
    category: 'query',
    summary: '查询所有类别及其使用统计（使用次数、最近使用时间等）',
    purpose: '了解哪些类别最常用，哪些很少用',
    useCases: [
      '查看类别列表',
      '了解类别使用频率',
      '决定是否删除某个类别'
    ],
    usedIn: [
      '类别管理页面的统计数据'
    ]
  },
  {
    name: 'get_category_usage_detail',
    title: '查看类别使用详情',
    category: 'query',
    summary: '查询某个类别的详细使用数据（总金额、平均金额等）',
    purpose: '深入了解某个类别的消费情况',
    useCases: [
      '查看"餐饮"类别的总花费',
      '了解某类别的平均消费金额'
    ],
    usedIn: [
      '类别详情页面'
    ]
  },
  {
    name: 'get_payment_methods_with_stats',
    title: '查看支付方式列表',
    category: 'query',
    summary: '查询所有支付方式及其使用统计',
    purpose: '了解各支付方式的使用频率',
    useCases: [
      '查看支付方式列表',
      '了解哪张卡用得最多'
    ],
    usedIn: [
      '支付方式管理页面'
    ]
  },
  {
    name: 'get_payment_method_usage_detail',
    title: '查看支付方式使用详情',
    category: 'query',
    summary: '查询某个支付方式的详细使用数据',
    purpose: '统计某个支付方式的消费情况',
    useCases: [
      '查看信用卡本月花了多少',
      '了解微信支付最常用于什么类别'
    ],
    usedIn: [
      '支付方式详情页面'
    ]
  },
  {
    name: 'get_monthly_budget_status',
    title: '查看本月预算状态',
    category: 'query',
    summary: '查询各类别本月预算的执行进度和超支情况',
    purpose: '实时监控预算使用情况，避免超支',
    useCases: [
      '查看本月各类别预算进度',
      '检查是否有类别超预算',
      '了解预算余额'
    ],
    usedIn: [
      '预算设置页面的进度显示',
      '首页预算概览'
    ]
  },
  {
    name: 'get_total_budget_summary',
    title: '查看预算总览',
    category: 'query',
    summary: '汇总本月所有预算的整体执行情况',
    purpose: '从全局了解本月的预算控制情况',
    useCases: [
      '查看本月总预算和总支出',
      '了解有多少类别超预算'
    ],
    usedIn: [
      '预算总览页面'
    ]
  },
  {
    name: 'get_budget_history',
    title: '查看预算历史趋势',
    category: 'query',
    summary: '回顾过去几个月的预算执行数据',
    purpose: '分析预算控制能力的变化趋势',
    useCases: [
      '查看最近6个月的预算执行',
      '对比不同月份的消费情况',
      '生成预算趋势图表'
    ],
    usedIn: [
      '预算历史页面',
      '预算趋势图表'
    ]
  },
  {
    name: 'calculate_category_avg_spending',
    title: '计算类别平均支出',
    category: 'query',
    summary: '算出某类别最近几个月的平均花费',
    purpose: '为设置预算提供参考依据',
    useCases: [
      '了解"餐饮"最近3个月平均花多少',
      '为新预算提供历史数据参考'
    ],
    usedIn: [
      'AI 预算建议的数据来源',
      '预算设置页面'
    ]
  },
  {
    name: 'get_cron_jobs',
    title: '查看定时任务列表',
    category: 'query',
    summary: '查询系统中所有的定时任务',
    purpose: '了解系统在后台自动运行哪些任务',
    useCases: [
      '查看所有定时任务',
      '了解任务执行时间'
    ],
    usedIn: [
      '定时任务管理页面'
    ]
  },
  {
    name: 'get_cron_job_stats',
    title: '查看定时任务统计',
    category: 'query',
    summary: '查询各定时任务的执行次数和成功率',
    purpose: '监控定时任务的运行状况',
    useCases: [
      '查看任务执行成功率',
      '了解任务运行频率'
    ],
    usedIn: [
      '定时任务管理页面的统计数据'
    ]
  },
  {
    name: 'get_cron_job_history',
    title: '查看定时任务执行历史',
    category: 'query',
    summary: '查询定时任务的历史执行记录',
    purpose: '追踪任务的执行情况，排查问题',
    useCases: [
      '查看今日任务执行记录',
      '检查任务是否执行失败'
    ],
    usedIn: [
      '定时任务管理页面的执行记录'
    ]
  },
  {
    name: 'get_today_cron_summary',
    title: '查看今日任务汇总',
    category: 'query',
    summary: '汇总今天所有定时任务的执行情况',
    purpose: '快速了解今日任务运行状况',
    useCases: [
      '查看今天运行了多少任务',
      '检查今日是否有任务失败'
    ],
    usedIn: [
      '定时任务管理页面顶部统计'
    ]
  },

  // ========== AI 智能函数 ==========
  {
    name: 'generate_budget_suggestion',
    title: 'AI 预算建议（单个类别）',
    category: 'ai',
    summary: 'AI 根据历史消费数据，为某个类别建议合理的预算金额',
    purpose: '当你不知道该设多少预算时，让 AI 帮你算',
    useCases: [
      '设置新预算时参考 AI 建议',
      '了解某类别的合理预算范围',
      '对比当前预算与 AI 建议的差异'
    ],
    usedIn: [
      '预算设置页面点击"AI 建议"',
      '预算建议浮窗'
    ]
  },
  {
    name: 'refresh_all_budget_suggestions',
    title: '刷新所有预算建议',
    category: 'ai',
    summary: '批量更新所有类别的 AI 预算建议',
    purpose: '保持 AI 建议的时效性，反映最新的消费趋势',
    useCases: [
      '定时任务每日自动刷新',
      '手动刷新所有类别的建议'
    ],
    usedIn: [
      '定时任务：每天自动执行',
      '预算页面的"刷新建议"按钮'
    ]
  },
  {
    name: 'predict_month_end_spending',
    title: '预测月末支出',
    category: 'ai',
    summary: '根据当前花费速度，预测本月底某类别会花多少钱',
    purpose: '提前预警，避免月底超预算',
    useCases: [
      '月中查看是否会超预算',
      '调整消费计划',
      '了解当前消费速度'
    ],
    usedIn: [
      '预算页面的预测提示',
      '预算预警通知'
    ]
  },
  {
    name: 'get_suggestion_success_rate',
    title: '查看 AI 建议成功率',
    category: 'ai',
    summary: '统计 AI 建议的准确率和采纳率',
    purpose: '评估 AI 建议的质量',
    useCases: [
      '了解 AI 建议是否可靠',
      '评估 AI 性能'
    ],
    usedIn: [
      'AI 性能监控页面'
    ]
  },
  {
    name: 'update_suggestion_stats',
    title: '更新建议统计',
    category: 'ai',
    summary: '记录用户是否采纳 AI 建议，用于优化算法',
    purpose: '让 AI 学习用户偏好，提供更准确的建议',
    useCases: [
      '用户采纳或拒绝建议时自动记录',
      '优化 AI 算法'
    ],
    usedIn: [
      '预算设置页面的反馈机制'
    ]
  },
  {
    name: 'aggregate_ai_performance_stats',
    title: '汇总 AI 性能统计',
    category: 'ai',
    summary: '汇总 AI 分析的性能数据和使用情况',
    purpose: '监控 AI 功能的运行状况',
    useCases: [
      '定时任务每日汇总',
      '生成 AI 性能报告'
    ],
    usedIn: [
      '定时任务：每天自动执行'
    ]
  },
  {
    name: 'annotate_spending_patterns',
    title: '分析消费模式',
    category: 'ai',
    summary: 'AI 学习你的消费习惯，发现规律性的消费模式',
    purpose: '为智能建议和异常检测提供数据基础',
    useCases: [
      '后台自动分析消费规律',
      '识别周期性支出',
      '发现异常消费'
    ],
    usedIn: [
      '定时任务：后台自动运行'
    ]
  },
  {
    name: 'extract_daily_features',
    title: '提取消费特征',
    category: 'ai',
    summary: '从你的账单中提取关键信息供 AI 学习',
    purpose: '持续优化 AI 模型，提供更智能的建议',
    useCases: [
      '每天自动提取特征数据',
      '训练 AI 模型'
    ],
    usedIn: [
      '定时任务：每日执行'
    ]
  },
  {
    name: 'export_training_snapshot',
    title: '导出训练数据快照',
    category: 'ai',
    summary: '定期导出训练数据快照供 AI 模型使用',
    purpose: '为 AI 训练提供数据支持',
    useCases: [
      '定期导出数据快照',
      'AI 模型训练'
    ],
    usedIn: [
      '定时任务：定期执行'
    ]
  },
  {
    name: 'update_daily_ai_stats',
    title: '更新每日 AI 统计',
    category: 'ai',
    summary: '更新 AI 功能的每日使用统计',
    purpose: '追踪 AI 功能的使用情况',
    useCases: [
      '每日统计 AI 调用次数',
      '监控 AI 性能'
    ],
    usedIn: [
      '定时任务：每日执行'
    ]
  },

  // ========== 系统维护函数 ==========
  {
    name: 'check_data_quality',
    title: '数据质量检查',
    category: 'maintenance',
    summary: '检查数据完整性、一致性和异常情况',
    purpose: '确保数据库数据的准确性和可靠性',
    useCases: [
      '定期检查数据质量',
      '发现数据异常',
      '生成质量报告'
    ],
    usedIn: [
      '定时任务：定期执行',
      '数据维护页面'
    ]
  },
  {
    name: 'generate_weekly_report',
    title: '生成周报',
    category: 'maintenance',
    summary: '生成每周的消费统计报告',
    purpose: '定期回顾本周的消费情况',
    useCases: [
      '每周自动生成报告',
      '查看本周消费概览'
    ],
    usedIn: [
      '定时任务：每周执行',
      '报告页面'
    ]
  }
];

/**
 * 获取所有函数按分类分组
 */
export function getFunctionsByCategory() {
  const grouped = {
    business: FUNCTIONS_CATALOG.filter(f => f.category === 'business'),
    query: FUNCTIONS_CATALOG.filter(f => f.category === 'query'),
    ai: FUNCTIONS_CATALOG.filter(f => f.category === 'ai'),
    maintenance: FUNCTIONS_CATALOG.filter(f => f.category === 'maintenance'),
  };

  return grouped;
}

/**
 * 根据名称获取函数信息
 */
export function getFunctionByName(name: string): FunctionInfo | undefined {
  return FUNCTIONS_CATALOG.find(f => f.name === name);
}

/**
 * 搜索函数
 */
export function searchFunctions(keyword: string): FunctionInfo[] {
  const lowerKeyword = keyword.toLowerCase();
  return FUNCTIONS_CATALOG.filter(f =>
    f.name.toLowerCase().includes(lowerKeyword) ||
    f.title.toLowerCase().includes(lowerKeyword) ||
    f.summary.toLowerCase().includes(lowerKeyword) ||
    f.purpose.toLowerCase().includes(lowerKeyword)
  );
}

/**
 * 获取分类统计
 */
export function getCategoryStats() {
  return {
    business: FUNCTIONS_CATALOG.filter(f => f.category === 'business').length,
    query: FUNCTIONS_CATALOG.filter(f => f.category === 'query').length,
    ai: FUNCTIONS_CATALOG.filter(f => f.category === 'ai').length,
    maintenance: FUNCTIONS_CATALOG.filter(f => f.category === 'maintenance').length,
    total: FUNCTIONS_CATALOG.length,
  };
}
