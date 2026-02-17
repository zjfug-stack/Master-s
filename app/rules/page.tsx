import { Nav } from '@/components/Nav';

export default function RulesPage() {
  return (
    <div className="space-y-4">
      <Nav />
      <h1 className="text-3xl font-bold">Rules</h1>
      <div className="prose prose-invert max-w-none">
        <h2>Core Format</h2>
        <ul>
          <li>Exactly 6 golfers: one per tier 1-6.</li>
          <li>Lowest total to par wins.</li>
          <li>Missed cut scores freeze after round 2.</li>
          <li>WD/DQ after start = DEAD team, ineligible for prizes.</li>
        </ul>
        <h2>Lock & Payments</h2>
        <ul>
          <li>Entries lock Wednesday 7:00 PM America/Chicago.</li>
          <li>Payment via Venmo. Leaderboard shows Paid badge.</li>
        </ul>
        <h2>Tie Breakers</h2>
        <ol>
          <li>Closest guess to winner final score.</li>
          <li>Tier 6 score.</li>
          <li>Tier 3 score.</li>
          <li>Tier 4 score.</li>
        </ol>
      </div>
    </div>
  );
}
