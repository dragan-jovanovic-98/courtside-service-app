"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import {
  LayoutDashboard,
  Building2,
  Bot,
  Phone,
  CreditCard,
  ShieldCheck,
  Activity,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { signOut } from "@/lib/supabase/auth";

const navItems = [
  { href: "/admin", label: "Home", icon: LayoutDashboard, exact: true },
  { href: "/admin/organizations", label: "Organizations", icon: Building2 },
  { href: "/admin/agents", label: "Agents", icon: Bot },
  { href: "/admin/phone-numbers", label: "Phone Numbers", icon: Phone },
  { href: "/admin/billing", label: "Billing", icon: CreditCard },
  { href: "/admin/verification", label: "Verification", icon: ShieldCheck },
  { href: "/admin/system", label: "System", icon: Activity },
];

interface AdminSidebarProps {
  userName: string;
  userInitials: string;
  onNavigate?: () => void;
}

export function AdminSidebar({ userName, userInitials, onNavigate }: AdminSidebarProps) {
  const pathname = usePathname();

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  }

  return (
    <aside className="flex h-full w-[210px] shrink-0 flex-col border-r border-border-default bg-[#0a0d12]">
      {/* Brand */}
      <div className="border-b border-border-default px-4 py-[22px]">
        <Link href="/admin" className="flex items-center gap-[11px]" onClick={onNavigate}>
          <div className="flex size-8 shrink-0 items-center justify-center rounded-[9px] border border-[rgba(245,158,11,0.12)] bg-[rgba(245,158,11,0.1)]">
            <Image
              src="/courtside-logo.svg"
              alt="Courtside AI"
              width={18}
              height={18}
            />
          </div>
          <div className="flex flex-col">
            <span className="font-brand text-base font-semibold tracking-[0.01em] text-text-primary">
              Courtside AI
            </span>
            <span className="inline-flex w-fit rounded bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-400">
              Admin
            </span>
          </div>
        </Link>
      </div>

      {/* Main nav */}
      <nav className="flex-1 space-y-0.5 px-2 py-[10px]">
        {navItems.map(({ href, label, icon: Icon, exact }) => {
          const active = isActive(href, exact);
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              className={cn(
                "flex w-full items-center gap-[10px] rounded-lg px-3 py-2 text-[13px] font-semibold transition-colors",
                active
                  ? "bg-[rgba(245,158,11,0.15)] text-amber-400"
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
        <div className="flex items-center gap-[10px] px-3 py-[10px]">
          <div className="flex size-[26px] shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-[9px] font-bold text-amber-400">
            {userInitials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[11px] text-text-muted">{userName}</div>
            <div className="text-[10px] text-text-dim">Super Admin</div>
          </div>
          <button
            onClick={() => signOut()}
            className="shrink-0 rounded-md p-1 text-text-dim transition-colors hover:bg-surface-card hover:text-text-muted"
            title="Sign out"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  );
}
