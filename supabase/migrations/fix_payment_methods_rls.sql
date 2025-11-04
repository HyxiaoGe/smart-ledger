-- =====================================================
-- 修复支付方式表的 RLS 策略
-- =====================================================

-- 1. 启用 RLS
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

-- 2. 删除可能存在的旧策略（如果有的话）
DROP POLICY IF EXISTS "Allow anonymous read access to payment_methods" ON public.payment_methods;
DROP POLICY IF EXISTS "Allow anonymous insert access to payment_methods" ON public.payment_methods;
DROP POLICY IF EXISTS "Allow anonymous update access to payment_methods" ON public.payment_methods;
DROP POLICY IF EXISTS "Allow anonymous delete access to payment_methods" ON public.payment_methods;

-- 3. 创建新策略 - 允许匿名和已认证用户访问
-- 注意：因为 user_id 都是 NULL，这是全局共享的支付方式，所以允许所有人访问

-- 允许读取
CREATE POLICY "Allow anonymous read access to payment_methods"
  ON public.payment_methods
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- 允许插入
CREATE POLICY "Allow anonymous insert access to payment_methods"
  ON public.payment_methods
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- 允许更新
CREATE POLICY "Allow anonymous update access to payment_methods"
  ON public.payment_methods
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- 允许删除
CREATE POLICY "Allow anonymous delete access to payment_methods"
  ON public.payment_methods
  FOR DELETE
  TO anon, authenticated
  USING (true);
