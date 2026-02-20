"use client";

import { useState } from "react";
import { Sidebar } from "./sidebar";
import { Header } from "./header";

export function DashboardShell({
  children,
  userName,
  userInitials,
  planName,
}: {
  children: React.ReactNode;
  userName: string;
  userInitials: string;
  planName?: string;
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
        <div className="mx-auto max-w-[920px]">{children}</div>
      </main>
    </div>
  );
}
