import { NextResponse } from 'next/server';
import { withErrorHandler } from '@/lib/domain/errors/errorHandler';
import { syncHolidayYear } from '@/lib/services/recurringExpenses.server';

export const POST = withErrorHandler(async (request: Request) => {
  const { searchParams } = new URL(request.url);
  const yearParam = searchParams.get('year');
  const year = yearParam ? Number(yearParam) : new Date().getFullYear();

  if (!Number.isFinite(year) || year < 2000 || year > 2100) {
    return NextResponse.json({ message: 'Invalid year' }, { status: 400 });
  }

  const result = await syncHolidayYear(year);
  return NextResponse.json({
    success: true,
    year: result.year,
    count: result.count,
  });
});
