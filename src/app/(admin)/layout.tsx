import { redirect } from "next/navigation";
import { getAdminProfile } from "@/lib/admin/auth";
import { AdminShell } from "@/components/admin/admin-shell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getAdminProfile();

  if (!profile) {
    redirect("/login");
  }

  const firstName = profile.first_name ?? "";
  const lastName = profile.last_name ?? "";
  const fullName = [firstName, lastName].filter(Boolean).join(" ") || profile.email;
  const initials =
    (firstName[0] ?? "") + (lastName[0] ?? "") || profile.email[0]?.toUpperCase() || "?";

  return (
    <AdminShell userName={fullName} userInitials={initials.toUpperCase()}>
      {children}
    </AdminShell>
  );
}
