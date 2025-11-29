import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandler } from '@/lib/api/errorHandler';
import {
  getAllCronJobs,
  getCronJobStats,
  getCronJobHistory,
} from '@/lib/services/cronService.server';

/**
 * GET /api/admin/cron - 获取 Cron 任务列表和统计
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
  const searchParams = request.nextUrl.searchParams;
  const type = searchParams.get('type') || 'all';
  const jobId = searchParams.get('job_id');
  const limit = parseInt(searchParams.get('limit') || '50');

  if (type === 'jobs') {
    const jobs = await getAllCronJobs();
    return NextResponse.json({ success: true, data: jobs });
  }

  if (type === 'stats') {
    const stats = await getCronJobStats();
    return NextResponse.json({ success: true, data: stats });
  }

  if (type === 'history') {
    const history = await getCronJobHistory(
      jobId ? parseInt(jobId) : undefined,
      limit
    );
    return NextResponse.json({ success: true, data: history });
  }

  // 默认返回所有数据
  const [jobs, stats, history] = await Promise.all([
    getAllCronJobs(),
    getCronJobStats(),
    getCronJobHistory(undefined, 20),
  ]);

  return NextResponse.json({
    success: true,
    data: { jobs, stats, history },
  });
});
