"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export function AccessForm({ next }: { next: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ password }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "رمز ورود درست نیست.");
      router.replace(next);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "رمز ورود درست نیست.");
      setBusy(false);
    }
  }

  return <form className="access-form" onSubmit={submit} noValidate>
    <label htmlFor="site-access-password">رمز ورود</label>
    <input id="site-access-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="off" required autoFocus />
    {error && <p className="form-error" role="alert">{error}</p>}
    <button className="primary-button" type="submit" disabled={busy}>{busy ? "در حال بررسی…" : "ورود به آزمون"}<span aria-hidden="true">←</span></button>
  </form>;
}
