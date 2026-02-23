import { getAdminWorkflowEvents } from "@/lib/queries/admin";
import { SystemClient } from "./_components/system-client";

export default async function AdminSystemPage() {
  const events = await getAdminWorkflowEvents();

  return <SystemClient events={events} />;
}
