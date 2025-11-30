/**
 * 手动触发固定账单生成 API
 */

import { NextRequest, NextResponse } from 'next/server';
import { manualGenerateRecurring } from '@/lib/services/recurringService.server';

export const runtime = 'nodejs';

export async function POST(_req: NextRequest) {
  try {
    const results = await manualGenerateRecurring();

    const successCount = results.filter(r => r.status === 'success').length;
    const failedCount = results.filter(r => r.status === 'failed').length;
    const skippedCount = results.filter(r => r.status === 'skipped').length;

    return NextResponse.json({
      success: true,
      results,
      summary: {
        total: results.length,
        success: successCount,
        failed: failedCount,
        skipped: skippedCount
      }
    });
  } catch (error) {
    console.error('手动生成固定账单失败:', error);
    return NextResponse.json(
      { error: '手动生成固定账单失败' },
      { status: 500 }
    );
  }
}
