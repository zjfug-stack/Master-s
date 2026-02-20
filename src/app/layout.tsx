import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Masters Pool 2026",
  description: "The 2026 Masters Tournament fantasy pool — pick your golfers and track your score.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">
        <header className="bg-[#006747] text-white shadow-md">
          <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl font-bold tracking-tight">Masters Pool</span>
              <span className="text-[#FFCD00] text-lg font-semibold">2026</span>
            </div>
            <nav className="flex gap-6 text-sm font-medium">
              <a href="/leaderboard" className="hover:text-[#FFCD00] transition-colors">Leaderboard</a>
              <a href="/enter" className="hover:text-[#FFCD00] transition-colors">Enter</a>
              <a href="/golfers" className="hover:text-[#FFCD00] transition-colors">Field</a>
              <a href="/rules" className="hover:text-[#FFCD00] transition-colors">Rules</a>
            </nav>
          </div>
        </header>

        <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8">
          {children}
        </main>

        <footer className="bg-[#006747] text-white text-center py-4 text-sm mt-auto">
          <p>Masters Pool 2026 &mdash; Augusta National Golf Club</p>
          <p className="text-[#FFCD00] text-xs mt-1">Scores powered by Sportradar</p>
        </footer>
      </body>
    </html>
  );
}
