import { notFound } from "next/navigation";
import { PreviewAssessment } from "@/features/assessment/preview-assessment";
import { publicSupabaseConfig } from "@/infrastructure/supabase/config";

export default function PreviewPage() {
  if (publicSupabaseConfig()) notFound();
  return <PreviewAssessment />;
}
