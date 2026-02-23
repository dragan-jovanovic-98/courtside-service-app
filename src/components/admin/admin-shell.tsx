"use client";

import { useState } from "react";
import { AdminSidebar } from "./admin-sidebar";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AdminShell({
  children,
  userName,
  userInitials,
}: {
  children: React.ReactNode;
  userName: string;
  userInitials: string;
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

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 md:relative md:z-auto ${
          sidebarOpen ? "block" : "hidden md:block"
        }`}
      >
        <AdminSidebar
          userName={userName}
          userInitials={userInitials}
          onNavigate={() => setSidebarOpen(false)}
        />
      </div>

      <main className="relative min-w-0 flex-1 overflow-y-auto px-4 py-4 md:px-7 md:py-5">
        {/* Mobile hamburger */}
        <div className="fixed left-4 top-4 z-10 md:hidden">
          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-text-dim hover:text-text-primary"
            onClick={() => setSidebarOpen((o) => !o)}
          >
            <Menu size={18} />
          </Button>
        </div>

        <div className="mx-auto max-w-[1100px]">{children}</div>
      </main>
    </div>
  );
}
