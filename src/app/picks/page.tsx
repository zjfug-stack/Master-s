"use client";

import { useState, useEffect } from "react";

interface Golfer {
  id: string;
  name: string;
  worldRank: number | null;
}

interface Tier {
  id: string;
  tierNumber: number;
  name: string;
  golfers: Golfer[];
}

// Maps tierId → selected golferId
type PickMap = Record<string, string>;

export default function PicksPage() {
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [picks, setPicks] = useState<PickMap>({});
  const [form, setForm] = useState({
    entrantName: "",
    entrantEmail: "",
    tiebreaker: "",
  });
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/golfers")
      .then((r) => r.json())
      .then((d) => setTiers(d.tiers ?? []));
  }, []);

  const totalTiers = tiers.length;
  const totalPicked = Object.keys(picks).length;

  function selectGolfer(tierId: string, golferId: string) {
    setPicks((prev) => ({ ...prev, [tierId]: golferId }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (totalPicked < totalTiers) {
      setMessage(`Please select one golfer from each tier (${totalPicked}/${totalTiers} done).`);
      setStatus("error");
      return;
    }

    setStatus("loading");
    try {
      const picksArray = Object.entries(picks).map(([tierId, golferId]) => ({
        tierId,
        golferId,
      }));

      const res = await fetch("/api/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entrantName: form.entrantName,
          entrantEmail: form.entrantEmail,
          tiebreaker: form.tiebreaker ? Number(form.tiebreaker) : undefined,
          picks: picksArray,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setStatus("success");
        setMessage("Entry submitted! Good luck at the Masters!");
        setPicks({});
        setForm({ entrantName: "", entrantEmail: "", tiebreaker: "" });
      } else {
        setStatus("error");
        setMessage(data.error ?? "Submission failed.");
      }
    } catch {
      setStatus("error");
      setMessage("Network error. Please try again.");
    }
  }

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">Submit Your Picks</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Choose one golfer from each tier. All {totalTiers || 6} picks count toward your total.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Entrant info */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-4">
          <h2 className="font-semibold text-gray-700">Your Information</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Your Name</label>
              <input
                required
                type="text"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#006747]"
                value={form.entrantName}
                onChange={(e) => setForm((f) => ({ ...f, entrantName: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                required
                type="email"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#006747]"
                value={form.entrantEmail}
                onChange={(e) => setForm((f) => ({ ...f, entrantEmail: e.target.value }))}
              />
            </div>
          </div>
          <div className="max-w-xs">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tiebreaker — winning score under par (e.g. 18)
            </label>
            <input
              type="number"
              min={0}
              max={30}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#006747]"
              value={form.tiebreaker}
              onChange={(e) => setForm((f) => ({ ...f, tiebreaker: e.target.value }))}
            />
          </div>
        </div>

        {/* Tier-by-tier selection */}
        {tiers.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-gray-400 text-sm">
            Loading field…
          </div>
        ) : (
          tiers.map((tier) => (
            <div key={tier.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between bg-[#006747] text-white px-4 py-3">
                <h2 className="font-bold">{tier.name}</h2>
                {picks[tier.id] && (
                  <span className="text-xs bg-[#FFCD00] text-[#006747] font-semibold px-2 py-0.5 rounded-full">
                    {tier.golfers.find((g) => g.id === picks[tier.id])?.name}
                  </span>
                )}
              </div>

              <div className="grid sm:grid-cols-2 gap-2 p-3">
                {tier.golfers.map((g) => {
                  const isSelected = picks[tier.id] === g.id;
                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => selectGolfer(tier.id, g.id)}
                      className={`flex items-center gap-3 p-3 rounded-lg border text-left text-sm transition-all
                        ${isSelected
                          ? "border-[#006747] bg-[#006747]/10 text-[#006747] font-semibold"
                          : "border-gray-200 hover:border-[#006747]/50 hover:bg-gray-50"
                        }`}
                    >
                      <span className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center text-[10px]
                        ${isSelected ? "border-[#006747] bg-[#006747] text-white" : "border-gray-400"}`}>
                        {isSelected ? "✓" : ""}
                      </span>
                      <span className="truncate">{g.name}</span>
                      {g.worldRank != null && (
                        <span className="ml-auto text-xs text-gray-400 shrink-0">#{g.worldRank}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))
        )}

        {/* Progress + submit */}
        {tiers.length > 0 && (
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>{totalPicked} of {totalTiers} tiers picked</span>
            <div className="flex gap-1">
              {tiers.map((t) => (
                <div
                  key={t.id}
                  className={`w-3 h-3 rounded-full ${picks[t.id] ? "bg-[#006747]" : "bg-gray-200"}`}
                />
              ))}
            </div>
          </div>
        )}

        {message && (
          <p className={`text-sm font-medium ${status === "success" ? "text-[#006747]" : "text-red-600"}`}>
            {message}
          </p>
        )}

        <button
          type="submit"
          disabled={status === "loading" || totalPicked < totalTiers}
          className="w-full bg-[#006747] text-white py-3 rounded-xl font-semibold text-sm
            hover:bg-[#005538] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {status === "loading"
            ? "Submitting…"
            : totalPicked < totalTiers
            ? `Pick ${totalTiers - totalPicked} more tier${totalTiers - totalPicked !== 1 ? "s" : ""}`
            : "Submit Entry"}
        </button>
      </form>
    </div>
  );
}
