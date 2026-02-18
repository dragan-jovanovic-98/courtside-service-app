"use client";

import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Header() {
  return (
    <header className="flex h-0 items-center justify-end px-7">
      {/* Notification bell — positioned absolutely in the top-right of the content area */}
      <div className="fixed right-7 top-5 z-10">
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
