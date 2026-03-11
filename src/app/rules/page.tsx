export default function RulesPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">Pool Rules</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Masters Pool 2026 &bull; Augusta National Golf Club &bull; April 9–12, 2026
        </p>
      </div>

      <Section title="How It Works">
        <p>
          Each participant selects one golfer from each of the six tiers. Your combined score
          is the sum of all six picks&apos; scores at the end of the tournament. Lowest total wins.
        </p>
      </Section>

      <Section title="Tiers">
        <p className="mb-3">
          The Masters field is divided into six tiers based on world ranking and odds.
          Tier 1 contains the favorites; Tier 6 contains long shots.
        </p>
        <TierTable />
      </Section>

      <Section title="Scoring">
        <ul className="list-disc pl-5 space-y-1 text-sm">
          <li>Scores are cumulative over all four rounds.</li>
          <li>Score is reported as strokes relative to par (e.g. −12 means 12 under par).</li>
          <li>All six picks count — there is no drop.</li>
          <li>
            <strong>Withdrawn / disqualified golfers</strong> receive a score of{" "}
            <strong>+10</strong> per missed round. A WD after Round 1 = +30 added
            to their score through 4 rounds.
          </li>
          <li>
            <strong>Cut golfers</strong> keep their 36-hole score and receive no
            additional strokes.
          </li>
        </ul>
      </Section>

      <Section title="Tiebreaker">
        <p>
          If two or more entries finish with the same total score, the tiebreaker is the
          predicted winning score (strokes under par) submitted at entry time.
          The entry closest to the actual winner&apos;s score wins. If still tied, prize is split.
        </p>
      </Section>

      <Section title="Entry & Payment">
        <ul className="list-disc pl-5 space-y-1 text-sm">
          <li>Entry fee is <strong>$20 per entry</strong> via Venmo.</li>
          <li>Multiple entries per person are permitted.</li>
          <li>
            Entries must be paid before the pick deadline. Unpaid entries will be removed
            at the pool commissioner&apos;s discretion.
          </li>
          <li>
            Picks lock at <strong>8:00 AM CT on Thursday, April 9, 2026</strong> (first tee time).
            No changes allowed after lock.
          </li>
        </ul>
      </Section>

      <Section title="Payouts">
        <ul className="list-disc pl-5 space-y-1 text-sm">
          <li><strong>1st place</strong> — 60% of total pot</li>
          <li><strong>2nd place</strong> — 25% of total pot</li>
          <li><strong>3rd place</strong> — 15% of total pot</li>
          <li>Payouts are issued via Venmo within 48 hours of the final round.</li>
        </ul>
      </Section>

      <Section title="Commissioner&apos;s Discretion">
        <p>
          The pool commissioner reserves the right to make final rulings on any disputed
          situations not covered by these rules. All decisions are final.
        </p>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-3">
      <h2 className="font-bold text-[#006747] text-lg border-b border-gray-100 pb-2">{title}</h2>
      <div className="text-gray-700 text-sm leading-relaxed">{children}</div>
    </section>
  );
}

function TierTable() {
  const rows = [
    { tier: "Tier 1 — Elite", desc: "Top 5 favorites; world top-10 players" },
    { tier: "Tier 2 — Contenders", desc: "Solid contenders; world 11–20" },
    { tier: "Tier 3 — Solid Picks", desc: "Proven Masters performers; world 21–35" },
    { tier: "Tier 4 — Dark Horses", desc: "Emerging talent and course specialists" },
    { tier: "Tier 5 — Value Plays", desc: "Experienced players with upside" },
    { tier: "Tier 6 — Long Shots", desc: "Qualifier spots and first-timers" },
  ];
  return (
    <div className="rounded-lg border border-gray-200 overflow-hidden text-sm">
      {rows.map((r, i) => (
        <div key={r.tier} className={`flex gap-4 px-4 py-2 ${i % 2 === 0 ? "bg-white" : "bg-gray-50"}`}>
          <span className="font-semibold text-[#006747] w-44 shrink-0">{r.tier}</span>
          <span className="text-gray-600">{r.desc}</span>
        </div>
      ))}
    </div>
  );
}
