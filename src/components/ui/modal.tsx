"use client";

import { type ReactNode } from "react";
import { X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";

interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
  className?: string;
}

export function Modal({
  open,
  onOpenChange,
  title,
  children,
  className,
}: ModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`border-border-default bg-[#14171e] shadow-[0_20px_60px_rgba(0,0,0,0.6)] ${className ?? ""}`}
      >
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-text-primary">
            {title}
          </DialogTitle>
          <DialogClose className="absolute right-4 top-4 text-text-dim hover:text-text-primary">
            <X className="size-4" />
          </DialogClose>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}
