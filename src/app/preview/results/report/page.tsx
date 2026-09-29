import { notFound } from "next/navigation";
import { publicSupabaseConfig } from "@/infrastructure/supabase/config";
import { PreviewResult } from "@/features/results/preview-result";
export default function Page() { if (publicSupabaseConfig()) notFound(); return <PreviewResult detailed/>; }
