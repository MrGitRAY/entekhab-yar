import "server-only";
import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { evaluate, ENGINE_VERSION } from "@/domain/matching/engine";
import { canonicalJson } from "@/domain/matching/canonical.mjs";
import type { Catalog, ResultSnapshot } from "@/domain/matching/types";
import { getCompletionClient } from "@/infrastructure/supabase/admin";

export async function evaluateAttempt(client: SupabaseClient, ownerId: string, attemptId: string): Promise<ResultSnapshot> {
  // Read with the caller's session and RLS before constructing a privileged client.
  const { data: attempt, error } = await client.from("attempts").select("id,owner_id,catalog_version,exam_group,status").eq("id", attemptId).eq("owner_id", ownerId).maybeSingle();
  if (error) throw new Error("READ_FAILED");
  if (!attempt) throw new Error("NOT_FOUND");
  if (attempt.status === "draft") throw new Error("NOT_SUBMITTED");
  if (attempt.status === "completed") {
    const result = await client.from("results").select("snapshot").eq("attempt_id", attemptId).single();
    if (result.error || !result.data) throw new Error("READ_FAILED");
    return result.data.snapshot as ResultSnapshot;
  }
  const [release, saved] = await Promise.all([
    client.from("catalog_releases").select("payload,sha256,sealed_at").eq("version", attempt.catalog_version).single(),
    client.from("answers").select("question_id,value").eq("attempt_id", attemptId),
  ]);
  if (release.error || saved.error || !release.data?.sealed_at || !saved.data) throw new Error("READ_FAILED");
  const catalog = release.data.payload as Catalog;
  if (catalog.scoring.engineVersion !== ENGINE_VERSION) throw new Error("UNSUPPORTED_CATALOG");
  const digest = (v: unknown) => createHash("sha256").update(canonicalJson(v)).digest("hex");
  if (digest(catalog) !== release.data.sha256) throw new Error("CATALOG_INTEGRITY_FAILED");
  const answers = Object.fromEntries(saved.data.map(row => [row.question_id, row.value]));
  const snapshot = evaluate(catalog, attempt.exam_group, answers);
  snapshot.integrity = { catalogSha256: release.data.sha256, answersSha256: digest(answers) };
  const admin = getCompletionClient();
  const completion = await admin.rpc("complete_attempt", { p_attempt_id: attemptId, p_engine_version: ENGINE_VERSION, p_snapshot: snapshot });
  if (completion.error) throw new Error("COMPLETION_FAILED");
  // Concurrent calls return the committed snapshot, never an uncommitted local one.
  const committed = await client.from("results").select("snapshot").eq("attempt_id", attemptId).single();
  if (committed.error || !committed.data) throw new Error("READ_FAILED");
  return committed.data.snapshot as ResultSnapshot;
}
