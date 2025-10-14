export function MonthlyExpenseSummary({ items, currency }: { items: { date: string; total: number; count: number }[]; currency: string }) {
  if (!items || items.length === 0) return <div className="text-sm text-muted-foreground">本月暂无支出</div>;
  return (
    <table className="w-full text-sm">
      <thead className="bg-muted/50">
        <tr>
          <th className="px-4 py-2 text-left text-muted-foreground font-medium">日期</th>
          <th className="px-4 py-2 text-right text-muted-foreground font-medium">支出合计</th>
          <th className="px-4 py-2 text-right text-muted-foreground font-medium">笔数</th>
        </tr>
      </thead>
      <tbody>
        {items.map((d) => (
          <tr key={d.date} className="border-t">
            <td className="px-4 py-2">{d.date}</td>
            <td className="px-4 py-2 text-right">{d.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currency}</td>
            <td className="px-4 py-2 text-right">{d.count}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

