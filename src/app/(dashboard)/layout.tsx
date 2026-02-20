import { redirect } from "next/navigation";
import { getUserProfile } from "@/lib/supabase/auth";
import { DashboardShell } from "@/components/layout/dashboard-shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getUserProfile();

  if (!profile) {
    redirect("/login");
  }

  const firstName = profile.first_name ?? "";
  const lastName = profile.last_name ?? "";
  const fullName = [firstName, lastName].filter(Boolean).join(" ") || profile.email;
  const initials =
    (firstName[0] ?? "") + (lastName[0] ?? "") || profile.email[0]?.toUpperCase() || "?";
  const planName = (profile.organizations as { name?: string } | null)?.name ?? undefined;

  return (
    <DashboardShell
      userName={fullName}
      userInitials={initials.toUpperCase()}
      planName={planName}
    >
      {children}
    </DashboardShell>
  );
}
