-- Generate monthly reports inside PostgreSQL (no Node.js dependency).
-- Matches PrismaMonthlyReportRepository.generate() rules.

CREATE OR REPLACE FUNCTION public.generate_monthly_report()
RETURNS void
LANGUAGE plpgsql
AS $function$
DECLARE
  v_year INTEGER;
  v_month INTEGER;
  v_prev_year INTEGER;
  v_prev_month INTEGER;
  v_month_start DATE;
  v_next_month_start DATE;
  v_last_month_start DATE;
  v_days_in_month INTEGER;
  v_total_expenses NUMERIC;
  v_fixed_expenses NUMERIC;
  v_variable_expenses NUMERIC;
  v_transaction_count INTEGER;
  v_fixed_transaction_count INTEGER;
  v_variable_transaction_count INTEGER;
  v_avg_transaction NUMERIC;
  v_avg_daily_expense NUMERIC;
  v_last_month_total NUMERIC;
  v_mom_change NUMERIC;
  v_mom_percentage NUMERIC;
  v_category_breakdown JSONB;
  v_fixed_expenses_breakdown JSONB;
  v_top_merchants JSONB;
  v_payment_method_stats JSONB;
BEGIN
  v_year := EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER;
  v_month := EXTRACT(MONTH FROM CURRENT_DATE)::INTEGER;

  IF v_month = 1 THEN
    v_prev_year := v_year - 1;
    v_prev_month := 12;
  ELSE
    v_prev_year := v_year;
    v_prev_month := v_month - 1;
  END IF;

  v_month_start := MAKE_DATE(v_prev_year, v_prev_month, 1);
  v_next_month_start := (v_month_start + INTERVAL '1 month')::DATE;
  v_last_month_start := (v_month_start - INTERVAL '1 month')::DATE;
  v_days_in_month := EXTRACT(DAY FROM (v_next_month_start - INTERVAL '1 day'))::INTEGER;

  SELECT
    COALESCE(SUM(amount), 0),
    COUNT(*),
    COALESCE(SUM(amount) FILTER (
      WHERE recurring_expense_id IS NOT NULL OR is_auto_generated IS TRUE
    ), 0),
    COUNT(*) FILTER (
      WHERE recurring_expense_id IS NOT NULL OR is_auto_generated IS TRUE
    ),
    COALESCE(SUM(amount) FILTER (
      WHERE NOT (recurring_expense_id IS NOT NULL OR is_auto_generated IS TRUE)
    ), 0),
    COUNT(*) FILTER (
      WHERE NOT (recurring_expense_id IS NOT NULL OR is_auto_generated IS TRUE)
    )
  INTO
    v_total_expenses,
    v_transaction_count,
    v_fixed_expenses,
    v_fixed_transaction_count,
    v_variable_expenses,
    v_variable_transaction_count
  FROM transactions
  WHERE deleted_at IS NULL
    AND type = 'expense'
    AND date >= v_month_start
    AND date < v_next_month_start;

  IF v_transaction_count = 0 THEN
    RAISE NOTICE 'No expenses for %-%; skipping monthly report.', v_prev_year, v_prev_month;
    RETURN;
  END IF;

  v_avg_transaction := CASE
    WHEN v_transaction_count > 0 THEN v_total_expenses / v_transaction_count
    ELSE 0
  END;
  v_avg_daily_expense := v_total_expenses / v_days_in_month;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'category', category,
        'amount', amount,
        'count', count,
        'percentage', CASE
          WHEN v_total_expenses > 0 THEN (amount / v_total_expenses) * 100
          ELSE 0
        END
      ) ORDER BY amount DESC
    ),
    '[]'::jsonb
  )
  INTO v_category_breakdown
  FROM (
    SELECT category, SUM(amount) AS amount, COUNT(*) AS count
    FROM transactions
    WHERE deleted_at IS NULL
      AND type = 'expense'
      AND date >= v_month_start
      AND date < v_next_month_start
    GROUP BY category
  ) AS category_stats;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'name', name,
        'category', category,
        'amount', amount,
        'count', count,
        'recurring_expense_id', recurring_expense_id
      ) ORDER BY amount DESC
    ),
    '[]'::jsonb
  )
  INTO v_fixed_expenses_breakdown
  FROM (
    SELECT
      COALESCE(note, category) AS name,
      category,
      COALESCE(recurring_expense_id::text, NULL) AS recurring_expense_id,
      SUM(amount) AS amount,
      COUNT(*) AS count
    FROM transactions
    WHERE deleted_at IS NULL
      AND type = 'expense'
      AND date >= v_month_start
      AND date < v_next_month_start
      AND (recurring_expense_id IS NOT NULL OR is_auto_generated IS TRUE)
    GROUP BY
      COALESCE(recurring_expense_id::text, 'manual_' || COALESCE(note, category)),
      COALESCE(note, category),
      category,
      recurring_expense_id
  ) AS fixed_stats;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'merchant', merchant,
        'amount', amount,
        'count', count
      ) ORDER BY amount DESC
    ),
    '[]'::jsonb
  )
  INTO v_top_merchants
  FROM (
    SELECT merchant, SUM(amount) AS amount, COUNT(*) AS count
    FROM transactions
    WHERE deleted_at IS NULL
      AND type = 'expense'
      AND date >= v_month_start
      AND date < v_next_month_start
      AND merchant IS NOT NULL
    GROUP BY merchant
    ORDER BY amount DESC
    LIMIT 10
  ) AS merchant_stats;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'method', method,
        'amount', amount,
        'count', count,
        'percentage', CASE
          WHEN v_total_expenses > 0 THEN (amount / v_total_expenses) * 100
          ELSE 0
        END
      ) ORDER BY amount DESC
    ),
    '[]'::jsonb
  )
  INTO v_payment_method_stats
  FROM (
    SELECT COALESCE(payment_method, '未指定') AS method, SUM(amount) AS amount, COUNT(*) AS count
    FROM transactions
    WHERE deleted_at IS NULL
      AND type = 'expense'
      AND date >= v_month_start
      AND date < v_next_month_start
    GROUP BY COALESCE(payment_method, '未指定')
  ) AS payment_stats;

  SELECT COALESCE(SUM(amount), 0)
  INTO v_last_month_total
  FROM transactions
  WHERE deleted_at IS NULL
    AND type = 'expense'
    AND date >= v_last_month_start
    AND date < v_month_start;

  v_mom_change := v_total_expenses - v_last_month_total;
  v_mom_percentage := CASE
    WHEN v_last_month_total > 0 THEN (v_mom_change / v_last_month_total) * 100
    ELSE 0
  END;

  INSERT INTO monthly_reports (
    year,
    month,
    total_expenses,
    fixed_expenses,
    variable_expenses,
    transaction_count,
    fixed_transaction_count,
    variable_transaction_count,
    average_transaction,
    average_daily_expense,
    category_breakdown,
    fixed_expenses_breakdown,
    top_merchants,
    payment_method_stats,
    month_over_month_change,
    month_over_month_percentage,
    generation_type,
    generated_at,
    created_at,
    updated_at
  ) VALUES (
    v_prev_year,
    v_prev_month,
    v_total_expenses,
    v_fixed_expenses,
    v_variable_expenses,
    v_transaction_count,
    v_fixed_transaction_count,
    v_variable_transaction_count,
    v_avg_transaction,
    v_avg_daily_expense,
    v_category_breakdown,
    v_fixed_expenses_breakdown,
    v_top_merchants,
    v_payment_method_stats,
    v_mom_change,
    v_mom_percentage,
    'auto',
    NOW(),
    NOW(),
    NOW()
  )
  ON CONFLICT (year, month)
  DO UPDATE SET
    total_expenses = EXCLUDED.total_expenses,
    fixed_expenses = EXCLUDED.fixed_expenses,
    variable_expenses = EXCLUDED.variable_expenses,
    transaction_count = EXCLUDED.transaction_count,
    fixed_transaction_count = EXCLUDED.fixed_transaction_count,
    variable_transaction_count = EXCLUDED.variable_transaction_count,
    average_transaction = EXCLUDED.average_transaction,
    average_daily_expense = EXCLUDED.average_daily_expense,
    category_breakdown = EXCLUDED.category_breakdown,
    fixed_expenses_breakdown = EXCLUDED.fixed_expenses_breakdown,
    top_merchants = EXCLUDED.top_merchants,
    payment_method_stats = EXCLUDED.payment_method_stats,
    month_over_month_change = EXCLUDED.month_over_month_change,
    month_over_month_percentage = EXCLUDED.month_over_month_percentage,
    updated_at = NOW();

  RAISE NOTICE 'Monthly report generated: %-%', v_prev_year, v_prev_month;
END;
$function$;
