import { redirect } from "next/navigation";
import { getUserProfile } from "@/lib/supabase/auth";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

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
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        userName={fullName}
        userInitials={initials.toUpperCase()}
        planName={planName}
      />
      <main className="relative flex-1 overflow-y-auto px-7 py-5">
        <Header />
        <div className="mx-auto max-w-[920px]">{children}</div>
      </main>
    </div>
  );
}
