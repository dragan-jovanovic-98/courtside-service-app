import { getCalls, getCallStats } from "@/lib/queries/calls";
import { CallsClient } from "./_components/calls-client";

export default async function CallsPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const [calls, stats, params] = await Promise.all([
    getCalls(),
    getCallStats(),
    searchParams,
  ]);

  return <CallsClient calls={calls} stats={stats} initialDetailId={params.id ?? null} />;
}
