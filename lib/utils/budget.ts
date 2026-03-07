export function getCurrentYearMonthParts(now = new Date()): { year: number; month: number } {
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
  };
}

export function formatBudgetMonthLabel(year: number, month: number): string {
  return `${year}年${month}月`;
}

export function getBudgetProgressBarColor(
  percentage: number,
  isOverBudget: boolean
): string {
  if (isOverBudget) return 'bg-red-500';
  if (percentage >= 80) return 'bg-orange-500';
  if (percentage >= 50) return 'bg-blue-500';
  return 'bg-green-500';
}
