export const SUPPORTED_CURRENCIES = [
  { code: 'CNY', symbol: '¥', name: '人民币' },
  { code: 'USD', symbol: '$', name: '美元' }
] as const;

export const DEFAULT_CURRENCY = 'CNY' as const;

// 预设类别
export const PRESET_CATEGORIES: { key: string; label: string; color?: string; icon?: string }[] = [
  { key: 'food', label: '吃饭', color: '#F97316', icon: '🍜' },
  { key: 'drink', label: '饮料', color: '#22C55E', icon: '🥤' },
  { key: 'transport', label: '交通', color: '#06B6D4', icon: '🚌' },
  { key: 'entertainment', label: '娱乐', color: '#A855F7', icon: '🎮' },
  { key: 'rent', label: '房租', color: '#3B82F6', icon: '🏠' },
  { key: 'utilities', label: '水电', color: '#0EA5E9', icon: '💡' },
  { key: 'daily', label: '日常开销', color: '#F59E0B', icon: '🧺' },
  { key: 'subscription', label: '订阅', color: '#EF4444', icon: '📦' },
  { key: 'other', label: '其他', color: '#6B7280', icon: '📁' }
];

// 子分类定义（对应merchant/subcategory/product三层结构）
export const SUBCATEGORY_DEFINITIONS: Record<string, { key: string; label: string }[]> = {
  food: [
    { key: 'breakfast', label: '早餐' },
    { key: 'lunch', label: '午餐' },
    { key: 'dinner', label: '晚餐' },
    { key: 'snack', label: '零食' },
    { key: 'takeout', label: '外卖' }
  ],
  drink: [
    { key: 'coffee', label: '咖啡' },
    { key: 'tea', label: '茶饮' },
    { key: 'juice', label: '果汁' },
    { key: 'water', label: '水' },
    { key: 'milk', label: '奶制品' }
  ],
  transport: [
    { key: 'subway', label: '地铁' },
    { key: 'taxi', label: '出租车' },
    { key: 'bus', label: '公交' },
    { key: 'bike', label: '共享单车' },
    { key: 'train', label: '火车' }
  ],
  entertainment: [
    { key: 'movie', label: '电影' },
    { key: 'game', label: '游戏' },
    { key: 'sport', label: '运动' },
    { key: 'music', label: '音乐' },
    { key: 'book', label: '图书' }
  ],
  daily: [
    { key: 'groceries', label: '买菜' },
    { key: 'household', label: '日用品' },
    { key: 'telecom', label: '话费网费' },
    { key: 'personal', label: '个人护理' },
    { key: 'laundry', label: '洗衣' }
  ],
  subscription: [
    { key: 'software', label: '软件订阅' },
    { key: 'service', label: '会员服务' },
    { key: 'network', label: '网络服务' },
    { key: 'media', label: '流媒体' }
  ],
  shopping: [
    { key: 'clothes', label: '服装' },
    { key: 'electronics', label: '电子产品' },
    { key: 'books', label: '图书' },
    { key: 'beauty', label: '美妆' }
  ],
  health: [
    { key: 'medical', label: '医疗' },
    { key: 'fitness', label: '健身' },
    { key: 'insurance', label: '保险' }
  ],
  social: [
    { key: 'dining', label: '聚餐' },
    { key: 'gift', label: '礼物' },
    { key: 'party', label: '聚会' }
  ]
};

// 常见商家建议（用于添加账单时的自动补全）
export const MERCHANT_SUGGESTIONS: Record<string, string[]> = {
  food: ['肯德基', '麦当劳', '必胜客', '和府捞面', '老乡鸡', '面包新语'],
  drink: ['瑞幸咖啡', 'Manner咖啡', '星巴克', '茶百道', '霸王茶姬'],
  transport: ['地铁', '滴滴出行', '哈啰单车', '美团单车'],
  daily: ['盒马', '美团买菜', '叮咚买菜', '永辉超市', '山姆会员店'],
  subscription: ['ChatGPT', 'Cluade', 'Cursor', 'GitHub'],
  entertainment: ['万达影城', 'Steam', '健身房', '网易云音乐'],
  other: ['美团', '饿了么', '淘宝', '京东']
};

// AI 服务首选：DeepSeek（可通过环境变量切换）
export const DEFAULT_AI_PROVIDER = 'deepseek' as const;
