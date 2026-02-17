import Link from 'next/link';
import { Nav } from '@/components/Nav';

export default function AdminPage() {
  return (
    <div className="space-y-4">
      <Nav />
      <h1 className="text-3xl font-bold">Admin</h1>
      <div className="space-x-3">
        <Link href="/admin/settings">Settings</Link>
        <Link href="/admin/tiers">Tiers</Link>
        <Link href="/admin/entries">Entries</Link>
      </div>
    </div>
  );
}
