-- ========================================
-- 创建周报表结构
-- ========================================
-- 表名: weekly_reports (匹配前端期望)

CREATE TABLE IF NOT EXISTS weekly_reports (
  id BIGSERIAL PRIMARY KEY,

  -- 用户关联
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- 时间范围
  week_start_date DATE NOT NULL,
  week_end_date DATE NOT NULL,

  -- 核心统计
  total_expenses DECIMAL(10, 2) NOT NULL DEFAULT 0,
  transaction_count INTEGER NOT NULL DEFAULT 0,
  average_transaction DECIMAL(10, 2) GENERATED ALWAYS AS (
    CASE
      WHEN transaction_count > 0 THEN total_expenses / transaction_count
      ELSE 0
    END
  ) STORED,

  -- 分类详情 (JSONB 数组)
  category_breakdown JSONB DEFAULT '[]'::jsonb,

  -- TOP 商户 (JSONB 数组)
  top_merchants JSONB DEFAULT '[]'::jsonb,

  -- 支付方式统计 (JSONB 数组) - 注意字段名匹配前端
  payment_method_stats JSONB DEFAULT '[]'::jsonb,

  -- 周环比数据
  week_over_week_change DECIMAL(10, 2) DEFAULT 0,
  week_over_week_percentage DECIMAL(5, 2) DEFAULT 0,

  -- AI 洞察 - 注意字段名匹配前端
  ai_insights TEXT,

  -- 生成元数据
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  generation_type VARCHAR(20) DEFAULT 'auto' CHECK (generation_type IN ('auto', 'manual')),

  -- 时间戳
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- 唯一约束：每周只能有一份报告
  UNIQUE(week_start_date, week_end_date)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_weekly_reports_week_start ON weekly_reports(week_start_date DESC);
CREATE INDEX IF NOT EXISTS idx_weekly_reports_user_id ON weekly_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_weekly_reports_generated_at ON weekly_reports(generated_at DESC);

-- 创建更新时间触发器
CREATE OR REPLACE FUNCTION update_weekly_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_weekly_reports_updated_at
  BEFORE UPDATE ON weekly_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_weekly_reports_updated_at();

-- 添加注释
COMMENT ON TABLE weekly_reports IS '每周消费报告表';
COMMENT ON COLUMN weekly_reports.week_start_date IS '报告周起始日期（周一）';
COMMENT ON COLUMN weekly_reports.week_end_date IS '报告周结束日期（周日）';
COMMENT ON COLUMN weekly_reports.category_breakdown IS '分类支出详情，格式: [{"category": "餐饮", "amount": 100, "count": 5, "percentage": 20}]';
COMMENT ON COLUMN weekly_reports.top_merchants IS 'TOP商户排行，格式: [{"merchant": "星巴克", "amount": 50, "count": 3}]';
COMMENT ON COLUMN weekly_reports.payment_method_stats IS '支付方式统计，格式: [{"method": "支付宝", "amount": 200, "count": 10, "percentage": 40}]';
COMMENT ON COLUMN weekly_reports.ai_insights IS 'AI生成的智能洞察和建议';
COMMENT ON COLUMN weekly_reports.generation_type IS '生成类型: auto-自动生成, manual-手动生成';
