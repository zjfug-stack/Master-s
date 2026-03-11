"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Golfer { id: string; name: string; worldRank: number | null; }
interface Tier { id: string; tierNumber: number; name: string; golfers: Golfer[]; }

interface Props {
  tiers: Tier[];
  lockAtLabel: string | null;
  entryFeeUsd: number;
}

type PickMap = Record<string, string>; // tierId → golferId

export default function EnterForm({ tiers, lockAtLabel, entryFeeUsd }: Props) {
  const router = useRouter();

  const [form, setForm] = useState({
    purchaserName: "",
    email: "",
    teamName: "",
    tiebreakerScore: "",
  });
  const [picks, setPicks] = useState<PickMap>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalPicked = Object.keys(picks).length;
  const totalTiers = tiers.length;
  const allPicked = totalPicked === totalTiers;

  function setField(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function selectGolfer(tierId: string, golferId: string) {
    setPicks((prev) => ({ ...prev, [tierId]: golferId }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!allPicked) {
      setError(`Select one golfer from every tier (${totalPicked}/${totalTiers} done).`);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          purchaserName: form.purchaserName,
          email: form.email,
          teamName: form.teamName,
          tiebreakerScore: form.tiebreakerScore ? Number(form.tiebreakerScore) : undefined,
          picks: Object.entries(picks).map(([tierId, golferId]) => ({ tierId, golferId })),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Submission failed. Please try again.");
        return;
      }

      router.push(`/pay?entryId=${data.entryId}`);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-800">Enter Masters Pool 2026</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Pick one golfer from each tier &bull; Entry fee: <strong>${entryFeeUsd}</strong>
          {lockAtLabel && (
            <> &bull; Picks lock: <strong>{lockAtLabel}</strong></>
          )}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Contact info */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-4">
          <h2 className="font-semibold text-gray-700 text-base">Your Information</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-gray-700">Your Name <span className="text-red-500">*</span></span>
              <input
                required
                type="text"
                autoComplete="name"
                placeholder="Jane Smith"
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#006747]"
                value={form.purchaserName}
                onChange={(e) => setField("purchaserName", e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-gray-700">Email <span className="text-red-500">*</span></span>
              <input
                required
                type="email"
                autoComplete="email"
                placeholder="jane@example.com"
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#006747]"
                value={form.email}
                onChange={(e) => setField("email", e.target.value)}
              />
            </label>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-gray-700">Team Name <span className="text-red-500">*</span></span>
              <input
                required
                type="text"
                placeholder="e.g. Amen Corner Crew"
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#006747]"
                value={form.teamName}
                onChange={(e) => setField("teamName", e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-gray-700">
                Tiebreaker — winner&apos;s score (strokes under par)
              </span>
              <input
                type="number"
                min={1}
                max={30}
                placeholder="e.g. 18"
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#006747]"
                value={form.tiebreakerScore}
                onChange={(e) => setField("tiebreakerScore", e.target.value)}
              />
            </label>
          </div>
        </div>

        {/* Tier picks */}
        {tiers.map((tier) => {
          const selectedId = picks[tier.id];
          const selectedGolfer = tier.golfers.find((g) => g.id === selectedId);
          return (
            <div key={tier.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between bg-[#006747] text-white px-4 py-3">
                <h2 className="font-bold text-sm">{tier.name}</h2>
                {selectedGolfer ? (
                  <span className="bg-[#FFCD00] text-[#006747] text-xs font-bold px-2 py-0.5 rounded-full">
                    ✓ {selectedGolfer.name}
                  </span>
                ) : (
                  <span className="text-white/60 text-xs">Pick one</span>
                )}
              </div>

              {tier.golfers.length === 0 ? (
                <p className="px-4 py-4 text-sm text-gray-400 italic">No golfers assigned yet.</p>
              ) : (
                <div className="grid sm:grid-cols-2 gap-2 p-3">
                  {tier.golfers.map((g) => {
                    const isSel = picks[tier.id] === g.id;
                    return (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => selectGolfer(tier.id, g.id)}
                        className={[
                          "flex items-center gap-2 px-3 py-2 rounded-lg border text-left text-sm transition-all",
                          isSel
                            ? "border-[#006747] bg-[#006747]/10 text-[#006747] font-semibold"
                            : "border-gray-200 hover:border-[#006747]/40 hover:bg-gray-50",
                        ].join(" ")}
                      >
                        <span className={[
                          "w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center text-[9px] leading-none",
                          isSel ? "border-[#006747] bg-[#006747] text-white" : "border-gray-300",
                        ].join(" ")}>
                          {isSel ? "✓" : ""}
                        </span>
                        <span className="truncate flex-1">{g.name}</span>
                        {g.worldRank != null && (
                          <span className="text-xs text-gray-400 shrink-0">#{g.worldRank}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {/* Progress indicator */}
        {tiers.length > 0 && (
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>{totalPicked} / {totalTiers} tiers selected</span>
            <div className="flex gap-1">
              {tiers.map((t) => (
                <div
                  key={t.id}
                  title={t.name}
                  className={`w-3 h-3 rounded-full transition-colors ${picks[t.id] ? "bg-[#006747]" : "bg-gray-200"}`}
                />
              ))}
            </div>
          </div>
        )}

        {error && (
          <p className="text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting || !allPicked}
          className={[
            "w-full py-3 rounded-xl font-semibold text-sm transition-colors",
            submitting || !allPicked
              ? "bg-gray-200 text-gray-400 cursor-not-allowed"
              : "bg-[#006747] text-white hover:bg-[#005538]",
          ].join(" ")}
        >
          {submitting
            ? "Submitting…"
            : !allPicked
            ? `${totalTiers - totalPicked} tier${totalTiers - totalPicked !== 1 ? "s" : ""} remaining`
            : `Submit Entry — Pay $${entryFeeUsd} via Venmo →`}
        </button>
      </form>
    </div>
  );
}
