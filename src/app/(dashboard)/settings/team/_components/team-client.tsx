"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ColoredBadge } from "@/components/ui/colored-badge";
import { Modal } from "@/components/ui/modal";
import { inviteTeamMember, removeTeamMember } from "@/lib/actions/settings";
import { fullName } from "@/lib/format";
import type { User } from "@/types";

export function TeamClient({ members }: { members: User[] }) {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviting, setInviting] = useState(false);

  const activeCount = members.filter((m) => m.status === "active").length;
  const pendingCount = members.filter((m) => m.status === "invited").length;

  const handleInvite = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setInviting(true);
    const formData = new FormData(e.currentTarget);
    await inviteTeamMember(formData);
    setInviting(false);
    setInviteOpen(false);
  };

  const handleRemove = async (userId: string) => {
    await removeTeamMember(userId);
  };

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
        {members.length > 0 ? (
          members.map((m, i) => {
            const isActive = m.status === "active";
            const name = fullName(m.first_name, m.last_name);
            const initials = name
              .split(" ")
              .map((w) => w[0])
              .join("")
              .toUpperCase();
            return (
              <div
                key={m.id}
                className={`flex items-center justify-between px-4 py-3 ${
                  i < members.length - 1
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
                      {name}
                    </div>
                    <div className="text-[11px] text-text-dim">{m.email}</div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <ColoredBadge color={isActive ? "emerald" : "amber"}>
                    {isActive ? "Active" : "Invited"}
                  </ColoredBadge>
                  <ColoredBadge>
                    {m.role.charAt(0).toUpperCase() + m.role.slice(1)}
                  </ColoredBadge>
                  {m.role !== "owner" && (
                    <button
                      onClick={() => handleRemove(m.id)}
                      className="flex p-1 text-text-dim hover:text-text-primary"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="px-5 py-5 text-center text-[13px] text-text-dim">
            No team members yet
          </div>
        )}
      </div>

      {/* Invite modal */}
      <Modal
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        title="Invite Team Member"
      >
        <form onSubmit={handleInvite} className="space-y-4 px-6 pb-6">
          <div>
            <label className="mb-1 block text-xs font-medium text-text-dim">
              Email Address
            </label>
            <input
              name="email"
              placeholder="name@company.com"
              required
              className="w-full rounded-lg border border-border-default bg-[rgba(255,255,255,0.04)] px-3 py-[9px] text-[13px] text-text-primary outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-text-dim">
              Role
            </label>
            <select
              name="role"
              className="w-full appearance-none rounded-lg border border-border-default bg-[rgba(255,255,255,0.04)] px-3 py-[9px] text-[13px] text-text-primary outline-none"
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="flex gap-2.5">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setInviteOpen(false)}
              className="flex-1 border border-border-default bg-[rgba(255,255,255,0.03)] text-text-muted hover:bg-[rgba(255,255,255,0.06)]"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={inviting}
              className="flex-1 bg-emerald-dark text-white hover:bg-emerald-dark/90"
            >
              {inviting ? "Sending..." : "Send Invite"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
