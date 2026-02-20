import { getTeamMembers } from "@/lib/queries/settings";
import { TeamClient } from "./_components/team-client";

export default async function TeamPage() {
  const members = await getTeamMembers();

  return <TeamClient members={members ?? []} />;
}
