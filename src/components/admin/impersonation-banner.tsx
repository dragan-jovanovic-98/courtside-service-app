"use client";

import { X } from "lucide-react";

interface ImpersonationBannerProps {
  orgName: string;
  onExit: () => void;
}

export function ImpersonationBanner({ orgName, onExit }: ImpersonationBannerProps) {
  return (
    <div className="fixed left-0 right-0 top-0 z-50 flex items-center justify-center gap-3 bg-amber-600 px-4 py-2 text-sm font-medium text-white">
      <span>
        Viewing as: <strong>{orgName}</strong>
      </span>
      <button
        onClick={onExit}
        className="inline-flex items-center gap-1 rounded bg-white/20 px-2 py-0.5 text-xs font-semibold transition-colors hover:bg-white/30"
      >
        <X size={12} />
        Exit
      </button>
    </div>
  );
}
