/**
 * /pay?entryId=... — payment confirmation page (server component)
 * Shows Venmo handle, amount, memo format, deep link, and current payment status.
 */
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: { entryId?: string };
}

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800 border-yellow-300",
  PAID:    "bg-green-100  text-green-800  border-green-300",
};

export default async function PayPage({ searchParams }: Props) {
  const { entryId } = searchParams;

  if (!entryId) {
    return (
      <div className="max-w-md mx-auto py-16 text-center text-gray-500">
        <p className="text-lg font-medium">No entry ID provided.</p>
        <p className="text-sm mt-1">
          <a href="/enter" className="text-[#006747] underline">Submit your picks</a> first.
        </p>
      </div>
    );
  }

  const entry = await prisma.entry.findUnique({
    where: { id: entryId },
    include: {
      pool: { select: { name: true, venmoHandle: true, entryFeeUsd: true } },
      picks: {
        include: {
          golfer: { select: { name: true } },
          tier: { select: { tierNumber: true, name: true } },
        },
        orderBy: { tier: { tierNumber: "asc" } },
      },
    },
  });

  if (!entry) {
    return (
      <div className="max-w-md mx-auto py-16 text-center text-gray-500">
        <p className="text-lg font-medium">Entry not found.</p>
        <p className="text-sm mt-1">
          <a href="/enter" className="text-[#006747] underline">Submit a new entry</a>.
        </p>
      </div>
    );
  }

  const { pool } = entry;
  const venmoHandle = pool.venmoHandle ?? "MastersPool2026";
  const fee = pool.entryFeeUsd;
  const memo = `Masters 2026 - ${entry.teamName}`;
  const venmoUrl = `https://venmo.com/${venmoHandle}?txn=pay&amount=${fee}&note=${encodeURIComponent(memo)}`;
  const statusStyle = STATUS_STYLES[entry.paidStatus] ?? STATUS_STYLES.PENDING;

  return (
    <div className="max-w-lg mx-auto space-y-6">
      {/* Success banner */}
      <div className="rounded-2xl bg-[#006747] text-white p-6 text-center shadow-lg">
        <div className="text-3xl mb-2">🏌️</div>
        <h1 className="text-2xl font-bold">Entry Submitted!</h1>
        <p className="text-green-100 text-sm mt-1">
          One last step — pay your entry fee to secure your spot.
        </p>
      </div>

      {/* Entry summary */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-gray-800">{entry.teamName}</h2>
          <span className={`text-xs font-semibold border px-2.5 py-0.5 rounded-full ${statusStyle}`}>
            {entry.paidStatus}
          </span>
        </div>
        <p className="text-sm text-gray-500">Submitted by {entry.purchaserName}</p>
        <ul className="space-y-1 pt-1 border-t border-gray-100">
          {entry.picks.map((p) => (
            <li key={p.tier.tierNumber} className="flex justify-between text-sm">
              <span className="text-gray-500">{p.tier.name}</span>
              <span className="font-medium">{p.golfer.name}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Payment instructions */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
        <h2 className="font-bold text-gray-800 text-base">Pay via Venmo</h2>

        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-1">Send to</p>
            <p className="font-bold text-gray-800 text-sm">@{venmoHandle}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-1">Amount</p>
            <p className="font-bold text-gray-800 text-sm">${fee}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-1">Memo</p>
            <p className="font-bold text-gray-800 text-sm break-all">{memo}</p>
          </div>
        </div>

        <p className="text-xs text-gray-400">
          <strong>Important:</strong> use the exact memo above so your payment can be matched to your entry.
        </p>

        <a
          href={venmoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full bg-[#3D95CE] hover:bg-[#3385b8] text-white font-bold py-3 rounded-xl transition-colors text-sm"
        >
          <VenmoIcon />
          Open Venmo and Pay ${fee}
        </a>

        {entry.paidStatus === "PAID" && (
          <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-800">
            <span className="text-lg">✅</span>
            <span>Payment confirmed — you&apos;re in!</span>
          </div>
        )}

        {entry.paidStatus === "PENDING" && (
          <p className="text-xs text-gray-400 text-center">
            Your status will update to <strong>PAID</strong> once your Venmo payment is verified.
            Check back here or watch your email.
          </p>
        )}
      </div>

      <div className="text-center">
        <a href="/" className="text-sm text-[#006747] underline font-medium">
          ← Back to leaderboard
        </a>
      </div>
    </div>
  );
}

function VenmoIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M19.5 2c.7 1.2 1 2.5 1 4 0 4.9-4.2 11.3-7.6 15.8H5.7L2.5 2.8l7-1.3 1.8 7.3c1.7-2.9 3.8-7.3 3.8-9.8 0-.9-.2-1.5-.4-2L19.5 2z" />
    </svg>
  );
}
