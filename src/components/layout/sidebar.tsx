"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import {
  Home,
  Megaphone,
  Users,
  Phone,
  CalendarDays,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/campaigns", label: "Campaigns", icon: Megaphone },
  { href: "/leads", label: "Leads", icon: Users },
  { href: "/calls", label: "Calls", icon: Phone },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
];

interface SidebarProps {
  userName: string;
  userInitials: string;
  planName?: string;
}

export function Sidebar({ userName, userInitials, planName }: SidebarProps) {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  }

  const settingsActive = pathname.startsWith("/settings");

  return (
    <aside className="flex w-[210px] shrink-0 flex-col border-r border-border-default bg-[#0a0d12]">
      {/* Brand */}
      <div className="border-b border-border-default px-4 py-[22px]">
        <Link href="/dashboard" className="flex items-center gap-[11px]">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-[9px] border border-[rgba(28,171,176,0.12)] bg-[rgba(28,171,176,0.1)]">
            <Image
              src="/courtside-logo.svg"
              alt="Courtside AI"
              width={18}
              height={18}
            />
          </div>
          <span className="font-brand text-base font-semibold tracking-[0.01em] text-text-primary">
            Courtside AI
          </span>
        </Link>
      </div>

      {/* Main nav */}
      <nav className="flex-1 space-y-0.5 px-2 py-[10px]">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex w-full items-center gap-[10px] rounded-lg px-3 py-2 text-[13px] font-semibold transition-colors",
                active
                  ? "bg-emerald-bg-strong text-emerald-light"
                  : "text-text-muted hover:bg-surface-card hover:text-text-primary"
              )}
            >
              <Icon size={16} />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="border-t border-border-default px-2 py-[10px]">
        <Link
          href="/settings"
          className={cn(
            "flex w-full items-center gap-[10px] rounded-lg px-3 py-2 text-[13px] font-semibold transition-colors",
            settingsActive
              ? "bg-emerald-bg-strong text-emerald-light"
              : "text-text-muted hover:bg-surface-card hover:text-text-primary"
          )}
        >
          <Settings size={16} />
          <span>Settings</span>
        </Link>

        {/* User info */}
        <div className="flex items-center gap-[10px] px-3 py-[10px]">
          <div className="flex size-[26px] shrink-0 items-center justify-center rounded-full bg-emerald-bg-strong text-[9px] font-bold text-emerald-light">
            {userInitials}
          </div>
          <div className="min-w-0">
            <div className="truncate text-[11px] text-text-muted">
              {userName}
            </div>
            {planName && (
              <div className="text-[10px] text-text-dim">{planName}</div>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
