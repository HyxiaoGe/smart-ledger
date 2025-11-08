import { NextRequest } from 'next/server';
import { revalidateTag, revalidatePath } from 'next/cache';
import { z } from 'zod';
import { validateRequest } from '@/lib/utils/validation';

// 验证 schema
const revalidateSchema = z.object({
  tag: z.enum(['transactions'], { message: 'Tag must be "transactions"' }).optional().default('transactions'),
  path: z.enum(['/', '/records'], { message: 'Path must be "/" or "/records"' }).optional().default('/')
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    // 验证输入
    const validation = validateRequest(revalidateSchema, body);
    if (!validation.success) {
      return validation.response;
    }

    const { tag, path } = validation.data;

    revalidateTag(tag);
    revalidatePath(path);
    return new Response(JSON.stringify({ revalidated: true, tag, path }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error?.message || 'failed to revalidate' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
