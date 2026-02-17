import { NextResponse } from 'next/server';
import { env } from '@/lib/env';
import { adminLoginSchema } from '@/lib/validation';

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = adminLoginSchema.safeParse(body);
  if (!parsed.success || parsed.data.password !== env.ADMIN_PASSWORD) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set('admin_auth', '1', { httpOnly: true, sameSite: 'lax', path: '/' });
  return response;
}
