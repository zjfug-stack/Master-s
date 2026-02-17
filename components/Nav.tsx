import Link from 'next/link';

const links = [
  ['Home', '/'],
  ['Enter', '/enter'],
  ['Pay', '/pay'],
  ['Leaderboard', '/leaderboard'],
  ['Rules', '/rules'],
  ['Admin', '/admin']
] as const;

export function Nav() {
  return (
    <nav className="mb-8 flex flex-wrap gap-4 text-sm">
      {links.map(([label, href]) => (
        <Link key={href} href={href} className="rounded border border-neutral-700 px-3 py-1 hover:bg-neutral-800">
          {label}
        </Link>
      ))}
    </nav>
  );
}
