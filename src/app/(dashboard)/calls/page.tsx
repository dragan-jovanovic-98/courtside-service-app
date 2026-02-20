import { getCalls, getCallStats } from "@/lib/queries/calls";
import { CallsClient } from "./_components/calls-client";

export default async function CallsPage() {
  const [calls, stats] = await Promise.all([getCalls(), getCallStats()]);

  return <CallsClient calls={calls} stats={stats} />;
}
