"use client";

import { Bell, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Header({ onMenuToggle }: { onMenuToggle?: () => void }) {
  return (
    <header className="flex h-0 items-center justify-between px-0">
      {/* Mobile hamburger */}
      <div className="fixed left-4 top-4 z-10 md:hidden">
        <Button
          variant="ghost"
          size="icon"
          className="size-8 text-text-dim hover:text-text-primary"
          onClick={onMenuToggle}
        >
          <Menu size={18} />
        </Button>
      </div>

      {/* Notification bell */}
      <div className="fixed right-4 top-4 z-10 md:right-7 md:top-5">
        <Button
          variant="ghost"
          size="icon"
          className="relative size-8 text-text-dim hover:text-text-primary"
        >
          <Bell size={16} />
        </Button>
      </div>
    </header>
  );
}
