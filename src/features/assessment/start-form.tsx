"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { parseStartInput, type ExamGroup } from "@/domain/assessment/input";
import { getBrowserClient } from "@/infrastructure/supabase/browser";
import type { Session } from "@supabase/supabase-js";

export function StartForm({ configured, accessRequired }: { configured: boolean; accessRequired: boolean }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [year, setYear] = useState("");
  const [group, setGroup] = useState<ExamGroup | "">("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [lastAttempt, setLastAttempt] = useState("");
  const [hasPreview, setHasPreview] = useState(false);

  async function begin(input: { displayName: string; examYear: number; examGroup: ExamGroup }) {
    setBusy(true);
    setError("");
    try {
      if (!configured) {
        sessionStorage.setItem("ey-preview-start", JSON.stringify(input));
        sessionStorage.removeItem("ey-preview-answers");
        sessionStorage.removeItem("ey-preview-result");
        router.push("/preview/assessment");
        return;
      }
      const client = getBrowserClient();
      let { data: sessionData } = await client.auth.getSession();
      if (!sessionData.session) {
        const signInEvent = new Promise<Session | null>((resolve) => {
          let settled = false;
          const finish = (session: Session | null) => {
            if (settled) return;
            settled = true;
            subscription.unsubscribe();
            resolve(session);
          };
          const authListener = client.auth.onAuthStateChange((event, session) => {
            if (event === "SIGNED_IN" && session) finish(session);
          });
          const subscription = authListener.data.subscription;
          window.setTimeout(() => finish(null), 3000);
        });
        const { data: signedIn, error: signInError } = await client.auth.signInAnonymously();
        if (signInError) throw signInError;
        sessionData = { session: signedIn.session ?? await signInEvent };
      }
      for (let attempt = 0; !sessionData.session?.access_token && attempt < 5; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 200));
        ({ data: sessionData } = await client.auth.getSession());
      }
      if (!sessionData.session?.access_token) throw new Error("نشست شما آماده نیست. دوباره شروع کنید.");
      const response = await fetch("/api/attempts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(sessionData.session?.access_token ? { Authorization: `Bearer ${sessionData.session.access_token}` } : {}),
        },
        credentials: "same-origin",
        body: JSON.stringify(input),
      });
      const result = await response.json();
      if (!response.ok || typeof result.id !== "string") throw new Error(result.error || "آزمون شروع نشد. دوباره تلاش کنید.");
      localStorage.setItem("ey-last-attempt", result.id);
      router.push(`/assessment/${result.id}`);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "";
      setError(message && (message.startsWith("آزمون") || message.startsWith("ذخیره") || message.startsWith("اطلاعات") || message.startsWith("به این") || message.startsWith("نشست"))
        ? message : "شروع آزمون انجام نشد. اتصال خود را بررسی و دوباره تلاش کنید.");
      setBusy(false);
    }
  }

  useEffect(() => {
    if (configured) {
      const savedId = localStorage.getItem("ey-last-attempt") ?? "";
      if (/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(savedId)) setLastAttempt(savedId);
    } else {
      setHasPreview(Boolean(sessionStorage.getItem("ey-preview-start")));
    }
  }, [configured]);

  useEffect(() => {
    if (!accessRequired || !configured || new URLSearchParams(window.location.search).get("start") !== "1") return;
    const raw = sessionStorage.getItem("ey-pending-start");
    sessionStorage.removeItem("ey-pending-start");
    if (!raw) return;
    try {
      const input = JSON.parse(raw);
      if (input && typeof input.displayName === "string" && Number.isInteger(input.examYear) && ["experimental", "mathematics"].includes(input.examGroup)) {
        setName(input.displayName);
        setYear(String(input.examYear));
        setGroup(input.examGroup);
        void begin(input);
      }
    } catch { /* stale browser data is ignored */ }
  }, [accessRequired, configured]);

  async function start(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setError("");
    let input;
    try {
      input = parseStartInput({ displayName: name, examYear: year, examGroup: group });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "اطلاعات اولیه معتبر نیست.");
      return;
    }
    if (accessRequired && configured) {
      sessionStorage.setItem("ey-pending-start", JSON.stringify(input));
      router.push("/access?next=/%3Fstart%3D1");
      return;
    }
    await begin(input);
  }

  return (
    <form onSubmit={start} className="start-form" noValidate>
      <div className="field">
        <label htmlFor="display-name">نام</label>
        <input id="display-name" name="displayName" type="text" autoComplete="given-name" maxLength={80}
          value={name} onChange={(event) => setName(event.target.value)} placeholder="نامی که دوست داری صدایت کنیم" required />
      </div>
      <div className="field">
        <label htmlFor="exam-year">سال کنکور</label>
        <input id="exam-year" name="examYear" type="text" inputMode="numeric" pattern="[0-9۰-۹٠-٩]{4}"
          maxLength={4} value={year} onChange={(event) => setYear(event.target.value)} placeholder="مثلاً ۱۴۰۵" required />
      </div>
      <fieldset className="group-field">
        <legend>رشته دبیرستان</legend>
        <div className="group-options">
          <label className={`group-option ${group === "experimental" ? "is-selected" : ""}`}>
            <input type="radio" name="examGroup" value="experimental" checked={group === "experimental"}
              onChange={() => setGroup("experimental")} />
            <span className="group-symbol" aria-hidden="true">✳</span>
            <span className="group-title">تجربی</span>
            <span className="group-check" aria-hidden="true">✓</span>
          </label>
          <label className={`group-option ${group === "mathematics" ? "is-selected" : ""}`}>
            <input type="radio" name="examGroup" value="mathematics" checked={group === "mathematics"}
              onChange={() => setGroup("mathematics")} />
            <span className="group-symbol" aria-hidden="true">⌘</span>
            <span className="group-title">ریاضی</span>
            <span className="group-check" aria-hidden="true">✓</span>
          </label>
        </div>
      </fieldset>
      {error && <p className="form-error" role="alert">{error}</p>}
      {!configured && <p className="form-note" role="status">پیش‌نمایش محلی: پاسخ‌ها تا بسته‌شدن این تب می‌مانند و به دیتابیس فرستاده نمی‌شوند.</p>}
      <button className="primary-button" type="submit" disabled={busy}>
        {busy ? "در حال آماده‌سازی آزمون…" : configured ? "شروع آزمون" : "پیش‌نمایش آزمون"}<span aria-hidden="true">←</span>
      </button>
      <p className="form-caption">۷۰ پرسش · پاسخ‌ها در همین مرورگر قابل ادامه‌اند</p>
      {configured && lastAttempt && <a className="resume-link" href={`/assessment/${lastAttempt}`}>ادامه آزمون قبلی</a>}
      {!configured && hasPreview && <a className="resume-link" href="/preview/assessment">ادامه پیش‌نمایش قبلی</a>}
    </form>
  );
}
