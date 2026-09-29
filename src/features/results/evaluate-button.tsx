"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function EvaluateButton({ attemptId, preview = false }: { attemptId: string; preview?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  if (preview) return <Link className="primary-button" href="/preview/results">دیدن نتیجهٔ اکتشافی ←</Link>;
  async function calculate() {
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/attempts/${attemptId}/evaluate`, { method: "POST", credentials: "same-origin" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      router.push(`/results/${attemptId}`);
    } catch (e) { setError(e instanceof Error ? e.message : "محاسبه انجام نشد. دوباره تلاش کنید."); setBusy(false); }
  }
  return <div><button className="primary-button" onClick={() => void calculate()} disabled={busy}>{busy ? "در حال بررسی پاسخ‌ها…" : "محاسبه و دیدن نتیجه ←"}</button>{error && <p className="form-error" role="alert">{error}</p>}</div>;
}
