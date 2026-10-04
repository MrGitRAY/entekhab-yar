import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import type { NextRequest } from "next/server";
import { publicSupabaseConfig } from "@/infrastructure/supabase/config";
import { authenticatedClient } from "@/server/services/api";
import { AssessmentReport } from "@/infrastructure/pdf/report";
import type { ResultSnapshot } from "@/domain/matching/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ attemptId: string }> }) {
  const attemptId = (await params).attemptId;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(attemptId) || !publicSupabaseConfig()) return new Response("Not found", { status: 404 });
  const session = await authenticatedClient();
  if (!session) return new Response("Unauthorized", { status: 401 });
  const { data: attempt } = await session.client.from("attempts").select("display_name,status").eq("id", attemptId).eq("owner_id", session.ownerId).maybeSingle();
  if (!attempt || attempt.status !== "completed") return new Response("Not found", { status: 404 });
  const { data } = await session.client.from("results").select("snapshot").eq("attempt_id", attemptId).single();
  if (!data) return new Response("Not found", { status: 404 });
  try {
    const pdf = await renderToBuffer(React.createElement(AssessmentReport, { result: data.snapshot as ResultSnapshot, displayName: attempt.display_name }) as any);
    const safeDisplayName = attempt.display_name.normalize("NFC").replace(/[\\/:*?"<>|\r\n]+/g, " ").trim() || "دانش‌آموز";
    const downloadName = `گزارش انتخاب یار - ${safeDisplayName}.pdf`;
    return new Response(new Uint8Array(pdf), { headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="entekhab-yar-report.pdf"; filename*=UTF-8''${encodeURIComponent(downloadName)}`,
      "Cache-Control": "private, no-store",
    } });
  } catch (error) {
    console.error("PDF report generation failed", error instanceof Error ? error.message : error);
    return Response.json({ error: "تولید گزارش PDF انجام نشد. دوباره تلاش کنید." }, { status: 500, headers: { "Cache-Control": "private, no-store" } });
  }
}



