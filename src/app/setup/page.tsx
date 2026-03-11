"use client";
import { useState } from "react";

export default function SetupPage() {
  const [secret, setSecret] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function run() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/setup", {
        method: "POST",
        headers: { "x-setup-secret": secret },
      });
      const json = await res.json();
      setResult(JSON.stringify(json, null, 2));
    } catch (e) {
      setResult(String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ fontFamily: "monospace", maxWidth: 500, margin: "80px auto", padding: "0 20px" }}>
      <h1>Database Setup</h1>
      <p>Run this once to create tables and seed the 2026 pool.</p>
      <input
        type="password"
        placeholder="CRON_SECRET value"
        value={secret}
        onChange={(e) => setSecret(e.target.value)}
        style={{ width: "100%", padding: 8, marginBottom: 12, fontSize: 14, boxSizing: "border-box" }}
      />
      <button
        onClick={run}
        disabled={loading || !secret}
        style={{ padding: "8px 20px", cursor: "pointer", fontSize: 14 }}
      >
        {loading ? "Running…" : "Initialize Database"}
      </button>
      {result && (
        <pre style={{ marginTop: 20, background: "#f4f4f4", padding: 16, overflowX: "auto", fontSize: 12 }}>
          {result}
        </pre>
      )}
    </main>
  );
}
