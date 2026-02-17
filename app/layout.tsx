import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Masters Pool 2026',
  description: 'Production-ready Masters pool app with live leaderboard.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <main className="mx-auto max-w-6xl p-6">{children}</main>
      </body>
    </html>
  );
}
