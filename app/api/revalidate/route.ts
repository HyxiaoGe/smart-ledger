import { NextRequest } from 'next/server';
import { revalidateTag, revalidatePath } from 'next/cache';

const ALLOWED_TAGS = new Set(['transactions']);
const ALLOWED_PATHS = new Set(['/', '/records']);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const tag = typeof body?.tag === 'string' ? body.tag : 'transactions';
    if (!ALLOWED_TAGS.has(tag)) {
      return new Response(JSON.stringify({ error: 'invalid tag' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    revalidateTag(tag);
    const path = typeof body?.path === 'string' && ALLOWED_PATHS.has(body.path) ? body.path : '/';
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
