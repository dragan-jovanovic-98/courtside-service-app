"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/settings/profile", label: "Profile" },
  { href: "/settings/billing", label: "Billing" },
  { href: "/settings/organization", label: "Organization" },
  { href: "/settings/team", label: "Team" },
  { href: "/settings/agents", label: "Agents" },
  { href: "/settings/verification", label: "Verification" },
  { href: "/settings/integrations", label: "Integrations" },
  { href: "/settings/compliance", label: "Compliance" },
];

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div>
      <h1 className="mb-5 text-2xl font-bold text-text-primary">Settings</h1>
      <div className="mb-6 flex flex-wrap gap-[3px]">
        {tabs.map((t) => {
          const active = pathname.startsWith(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              className={cn(
                "rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors",
                active
                  ? "bg-[rgba(255,255,255,0.1)] text-text-primary"
                  : "bg-[rgba(255,255,255,0.03)] text-text-dim hover:text-text-muted"
              )}
            >
              {t.label}
            </Link>
          );
        })}
      </div>
      {children}
    </div>
  );
}
