/**
 * 数据库迁移脚本：为 transactions 表添加 payment_method 字段
 *
 * 使用方法：
 * npx tsx scripts/migrate-payment-method.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// 加载环境变量
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 错误：缺少 Supabase 配置');
  console.error('请确保 .env.local 文件中设置了以下环境变量：');
  console.error('  - NEXT_PUBLIC_SUPABASE_URL');
  console.error('  - NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  console.log('🚀 开始执行数据库迁移...\n');

  try {
    // 读取迁移 SQL 文件
    const sqlPath = path.join(__dirname, '..', 'supabase', 'migrations', 'add_payment_method_to_transactions.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');

    console.log('📄 读取迁移文件: add_payment_method_to_transactions.sql');
    console.log('📝 SQL 内容长度:', sql.length, '字符\n');

    // 分割 SQL 语句（按分号分割，但忽略函数体内的分号）
    // 简单起见，我们直接执行整个 SQL 文件
    // 注意：Supabase 客户端可能不支持执行包含多个语句的 SQL
    // 如果遇到问题，需要手动在 Supabase Dashboard 中执行

    console.log('⚠️  注意：由于 Supabase 客户端的限制，某些复杂 SQL 可能需要手动执行');
    console.log('如果自动执行失败，请：');
    console.log('1. 访问 Supabase Dashboard: ' + supabaseUrl.replace('.supabase.co', '.supabase.co/project/_/sql'));
    console.log('2. 打开 SQL Editor');
    console.log('3. 复制并执行 supabase/migrations/add_payment_method_to_transactions.sql 文件内容\n');

    // 尝试执行 SQL（可能会因为权限或多语句问题失败）
    console.log('🔧 尝试执行迁移...\n');

    // 方法 1：尝试使用 rpc 调用（如果有权限）
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql }).catch(() => ({
      data: null,
      error: { message: 'exec_sql function not available' }
    }));

    if (error && error.message !== 'exec_sql function not available') {
      throw error;
    }

    if (data !== null) {
      console.log('✅ 迁移执行成功！');
      console.log('📊 执行结果:', data);
    } else {
      // 方法 2：逐条执行关键步骤
      console.log('📌 使用备用方案：逐条执行关键步骤...\n');

      // 步骤 1：添加列
      console.log('1️⃣  添加 payment_method 列...');
      await supabase.rpc('exec', {
        sql: 'ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS payment_method TEXT'
      }).catch(() => {
        console.log('   ℹ️  无法通过 RPC 执行，请手动添加列');
      });

      // 步骤 2：检查列是否存在
      console.log('2️⃣  检查表结构...');
      const { data: columns } = await supabase
        .from('transactions')
        .select('*')
        .limit(1)
        .single();

      if (columns && 'payment_method' in columns) {
        console.log('   ✅ payment_method 列已存在');
      } else {
        console.log('   ⚠️  payment_method 列不存在，需要手动执行迁移');
        console.log('\n⚠️  请手动执行以下步骤：');
        console.log('1. 访问 Supabase Dashboard SQL Editor');
        console.log('2. 执行文件: supabase/migrations/add_payment_method_to_transactions.sql');
        process.exit(1);
      }

      console.log('\n✅ 迁移完成！');
    }

    // 验证迁移结果
    console.log('\n🔍 验证迁移结果...');

    // 检查支付方式列表
    const { data: paymentMethods, error: pmError } = await supabase.rpc('get_payment_methods_with_stats');

    if (pmError) {
      console.log('❌ 验证失败:', pmError.message);
      console.log('\n请手动执行迁移文件，确保所有步骤都成功执行。');
    } else {
      console.log('✅ 支付方式查询成功！');
      console.log('📊 当前支付方式数量:', paymentMethods?.length || 0);
      if (paymentMethods && paymentMethods.length > 0) {
        console.log('📋 支付方式列表:');
        paymentMethods.forEach((pm: any) => {
          console.log(`   - ${pm.name} (${pm.type}) - 使用次数: ${pm.usage_count}`);
        });
      }
    }

    console.log('\n🎉 迁移脚本执行完毕！');

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '未知错误';
    console.error('\n❌ 迁移失败:', message);
    console.error('\n请尝试手动执行迁移：');
    console.error('1. 访问 Supabase Dashboard');
    console.error('2. 进入 SQL Editor');
    console.error('3. 执行 supabase/migrations/add_payment_method_to_transactions.sql');
    process.exit(1);
  }
}

// 运行迁移
runMigration();
