"use client";

import { useState, useEffect } from "react";

interface Golfer {
  id: string;
  name: string;
  worldRank: number | null;
}

export default function PicksPage() {
  const [golfers, setGolfers] = useState<Golfer[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [form, setForm] = useState({
    userName: "",
    userEmail: "",
    entryName: "",
    tiebreaker: "",
  });
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/golfers")
      .then((r) => r.json())
      .then((d) => setGolfers(d.golfers ?? []));
  }, []);

  function toggleGolfer(id: string) {
    setSelected((prev) =>
      prev.includes(id)
        ? prev.filter((g) => g !== id)
        : prev.length < 5
        ? [...prev, id]
        : prev
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (selected.length !== 5) {
      setMessage("Please select exactly 5 golfers.");
      setStatus("error");
      return;
    }
    setStatus("loading");
    try {
      const res = await fetch("/api/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userName: form.userName,
          userEmail: form.userEmail,
          entryName: form.entryName,
          golferIds: selected,
          tiebreaker: form.tiebreaker ? Number(form.tiebreaker) : undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatus("success");
        setMessage("Entry submitted! Good luck!");
        setSelected([]);
        setForm({ userName: "", userEmail: "", entryName: "", tiebreaker: "" });
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
          Choose 5 golfers. Your best 4 scores count toward your total.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Entry info */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-4">
          <h2 className="font-semibold text-gray-700">Your Information</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Your Name</label>
              <input
                required
                type="text"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#006747]"
                value={form.userName}
                onChange={(e) => setForm((f) => ({ ...f, userName: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                required
                type="email"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#006747]"
                value={form.userEmail}
                onChange={(e) => setForm((f) => ({ ...f, userEmail: e.target.value }))}
              />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Entry Name</label>
              <input
                required
                type="text"
                placeholder="e.g. John's Picks A"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#006747]"
                value={form.entryName}
                onChange={(e) => setForm((f) => ({ ...f, entryName: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tiebreaker — winning score (under par, e.g. 18)
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
        </div>

        {/* Golfer selection */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-700">Select 5 Golfers</h2>
            <span className="text-sm text-[#006747] font-medium">{selected.length} / 5 selected</span>
          </div>

          {golfers.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">Loading field...</p>
          ) : (
            <div className="grid sm:grid-cols-2 gap-2 max-h-96 overflow-y-auto pr-1">
              {golfers.map((g) => {
                const isSelected = selected.includes(g.id);
                const isDisabled = !isSelected && selected.length >= 5;
                return (
                  <button
                    key={g.id}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => toggleGolfer(g.id)}
                    className={`flex items-center gap-3 p-3 rounded-lg border text-left text-sm transition-all
                      ${isSelected
                        ? "border-[#006747] bg-[#006747]/10 text-[#006747] font-semibold"
                        : isDisabled
                        ? "border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed"
                        : "border-gray-200 hover:border-[#006747]/50 hover:bg-gray-50"
                      }`}
                  >
                    <span className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0
                      border-current text-xs">
                      {isSelected ? "✓" : ""}
                    </span>
                    <span className="truncate">{g.name}</span>
                    {g.worldRank && (
                      <span className="ml-auto text-xs text-gray-400 shrink-0">#{g.worldRank}</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {message && (
          <p className={`text-sm font-medium ${status === "success" ? "text-[#006747]" : "text-red-600"}`}>
            {message}
          </p>
        )}

        <button
          type="submit"
          disabled={status === "loading"}
          className="w-full bg-[#006747] text-white py-3 rounded-xl font-semibold text-sm
            hover:bg-[#005538] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {status === "loading" ? "Submitting..." : "Submit Entry"}
        </button>
      </form>
    </div>
  );
}
