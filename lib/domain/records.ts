type ExpenseTransaction = {
  type?: string;
  date?: string;
  amount?: number | string;
  note?: string;
  [key: string]: any;
};

export function partitionExpenseTransactions<T extends ExpenseTransaction>(
  rows: T[] | undefined | null
) {
  const expenseTransactions = (rows || []).filter((row) => row?.type === 'expense');

  const dailyTotals = new Map<string, { total: number; count: number }>();

  for (const transaction of expenseTransactions) {
    const date = transaction.date ?? '';
    const amount = Number(transaction.amount || 0);
    if (!date) continue;

    const current = dailyTotals.get(date) || { total: 0, count: 0 };
    dailyTotals.set(date, {
      total: current.total + amount,
      count: current.count + 1
    });
  }

  const dailyItems = Array.from(dailyTotals.entries())
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([date, value]) => ({
      date,
      total: value.total,
      count: value.count
    }));

  return { expenseTransactions, dailyItems };
}
