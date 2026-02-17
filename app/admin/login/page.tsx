import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { env } from '@/lib/env';
import { Nav } from '@/components/Nav';

async function login(formData: FormData) {
  'use server';
  const password = String(formData.get('password') ?? '');
  if (password === env.ADMIN_PASSWORD) {
    cookies().set('admin_auth', '1', { httpOnly: true, sameSite: 'lax', path: '/' });
    redirect('/admin');
  }
  redirect('/admin/login');
}

export default function AdminLoginPage() {
  return (
    <div className="space-y-4">
      <Nav />
      <h1 className="text-2xl font-bold">Admin Login</h1>
      <form action={login} className="max-w-sm space-y-2">
        <input name="password" type="password" className="w-full rounded bg-neutral-900 p-2" placeholder="Password" />
        <button className="rounded bg-emerald-700 px-4 py-2">Login</button>
      </form>
    </div>
  );
}
