import { OwnedResult } from "@/features/results/owned-result";
export const dynamic = "force-dynamic";
export default async function Page({ params }: { params: Promise<{ attemptId: string }> }) { return <OwnedResult attemptId={(await params).attemptId} detailed/>; }
