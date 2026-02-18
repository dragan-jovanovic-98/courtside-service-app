"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ColoredBadge } from "@/components/ui/colored-badge";
import { Modal } from "@/components/ui/modal";
import { mockTeamMembers } from "@/lib/mock-data";

export function TeamClient() {
  const [inviteOpen, setInviteOpen] = useState(false);

  const activeCount = mockTeamMembers.filter((m) => m.status === "Active").length;
  const pendingCount = mockTeamMembers.filter((m) => m.status === "Invited").length;

  return (
    <div className="max-w-[580px]">
      {/* Header */}
      <div className="mb-3.5 flex items-center justify-between">
        <div>
          <span className="text-[13px] text-text-muted">
            Manage team members and roles.
          </span>
          <div className="mt-0.5 text-[11px] text-text-dim">
            {activeCount} members &middot; {pendingCount} pending invite
          </div>
        </div>
        <Button
          onClick={() => setInviteOpen(true)}
          className="gap-1.5 bg-emerald-dark text-white hover:bg-emerald-dark/90"
        >
          <Plus size={13} /> Invite Member
        </Button>
      </div>

      {/* Member list */}
      <div className="overflow-hidden rounded-xl border border-border-default bg-surface-card">
        {mockTeamMembers.map((m, i) => {
          const isActive = m.status === "Active";
          const initials = m.name
            .split(" ")
            .map((w) => w[0])
            .join("");
          return (
            <div
              key={i}
              className={`flex items-center justify-between px-4 py-3 ${
                i < mockTeamMembers.length - 1
                  ? "border-b border-border-light"
                  : ""
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className={`flex h-[34px] w-[34px] items-center justify-center rounded-full text-[11px] font-semibold ${
                    isActive
                      ? "bg-emerald-bg-strong text-emerald-light"
                      : "bg-[rgba(255,255,255,0.06)] text-text-dim"
                  }`}
                >
                  {initials}
                </div>
                <div>
                  <div className="text-[13px] font-semibold text-text-primary">
                    {m.name}
                  </div>
                  <div className="text-[11px] text-text-dim">{m.email}</div>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <ColoredBadge color={isActive ? "emerald" : "amber"}>
                  {m.status}
                </ColoredBadge>
                <ColoredBadge>{m.role}</ColoredBadge>
                {m.role !== "Owner" && (
                  <button className="flex p-1 text-text-dim hover:text-text-primary">
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Invite modal */}
      <Modal
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        title="Invite Team Member"
      >
        <div className="space-y-4 px-6 pb-6">
          <div>
            <label className="mb-1 block text-xs font-medium text-text-dim">
              Email Address
            </label>
            <input
              placeholder="name@company.com"
              className="w-full rounded-lg border border-border-default bg-[rgba(255,255,255,0.04)] px-3 py-[9px] text-[13px] text-text-primary outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-text-dim">
              Role
            </label>
            <select className="w-full appearance-none rounded-lg border border-border-default bg-[rgba(255,255,255,0.04)] px-3 py-[9px] text-[13px] text-text-primary outline-none">
              <option>Member</option>
              <option>Admin</option>
            </select>
          </div>
          <div className="flex gap-2.5">
            <Button
              variant="ghost"
              onClick={() => setInviteOpen(false)}
              className="flex-1 border border-border-default bg-[rgba(255,255,255,0.03)] text-text-muted hover:bg-[rgba(255,255,255,0.06)]"
            >
              Cancel
            </Button>
            <Button
              onClick={() => setInviteOpen(false)}
              className="flex-1 bg-emerald-dark text-white hover:bg-emerald-dark/90"
            >
              Send Invite
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
