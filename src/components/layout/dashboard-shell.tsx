"use client";

import { useState } from "react";
import Link from "next/link";
import { ShieldAlert, Clock, ArrowRight } from "lucide-react";
import { Sidebar } from "./sidebar";
import { Header } from "./header";

function VerificationBanner({
  status,
}: {
  status: string;
}) {
  if (status === "approved") return null;

  if (status === "in_progress") {
    return (
      <div className="mb-4 flex items-center gap-2.5 rounded-lg border border-amber-400/20 bg-amber-400/[0.06] px-4 py-2.5">
        <Clock size={14} className="shrink-0 text-amber-400" />
        <span className="text-[13px] text-amber-300">
          Verification is pending review — campaigns will be available once approved.
        </span>
      </div>
    );
  }

  // not_started or rejected
  const isRejected = status === "rejected";

  return (
    <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-amber-400/20 bg-amber-400/[0.06] px-4 py-2.5">
      <div className="flex items-center gap-2.5">
        <ShieldAlert size={14} className="shrink-0 text-amber-400" />
        <span className="text-[13px] text-amber-300">
          {isRejected
            ? "Verification was not approved — please resubmit to enable campaigns."
            : "Complete verification to start running campaigns."}
        </span>
      </div>
      <Link
        href="/settings/verification"
        className="flex shrink-0 items-center gap-1 rounded-md bg-amber-400/15 px-3 py-1.5 text-[12px] font-semibold text-amber-300 transition-colors hover:bg-amber-400/25"
      >
        {isRejected ? "Resubmit" : "Verify Now"}
        <ArrowRight size={12} />
      </Link>
    </div>
  );
}

export function DashboardShell({
  children,
  userName,
  userInitials,
  planName,
  verificationStatus = "approved",
}: {
  children: React.ReactNode;
  userName: string;
  userInitials: string;
  planName?: string;
  verificationStatus?: string;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — hidden on mobile, overlay when open */}
      <div
        className={`fixed inset-y-0 left-0 z-50 md:relative md:z-auto ${
          sidebarOpen ? "block" : "hidden md:block"
        }`}
      >
        <Sidebar
          userName={userName}
          userInitials={userInitials}
          planName={planName}
          onNavigate={() => setSidebarOpen(false)}
        />
      </div>

      <main className="relative min-w-0 flex-1 overflow-y-auto px-4 py-4 md:px-7 md:py-5">
        <Header onMenuToggle={() => setSidebarOpen((o) => !o)} />
        <div className="mx-auto max-w-[920px]">
          <VerificationBanner status={verificationStatus} />
          {children}
        </div>
      </main>
    </div>
  );
}
