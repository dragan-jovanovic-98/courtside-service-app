"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionLabel } from "@/components/ui/section-label";
import { mockUser, mockNotificationPrefs } from "@/lib/mock-data";

export function ProfileClient() {
  const [notifications, setNotifications] = useState(
    mockNotificationPrefs.map(([label, channels]) => ({
      label: label as string,
      channels: [...channels] as [number, number, number],
    }))
  );

  const toggleNotification = (rowIdx: number, colIdx: number) => {
    setNotifications((prev) =>
      prev.map((row, i) => {
        if (i !== rowIdx) return row;
        const next = [...row.channels] as [number, number, number];
        next[colIdx] = next[colIdx] ? 0 : 1;
        return { ...row, channels: next };
      })
    );
  };

  return (
    <div className="max-w-[520px]">
      {/* Profile card */}
      <div className="mb-4 rounded-xl border border-border-default bg-surface-card p-6">
        <div className="mb-5 flex items-center gap-3.5">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-bg-strong text-lg font-bold text-emerald-light">
            {mockUser.initials}
          </div>
          <div className="flex-1">
            <div className="text-base font-semibold text-text-primary">
              {mockUser.firstName} {mockUser.lastName}
            </div>
            <div className="text-xs text-text-dim">{mockUser.email}</div>
            <div className="mt-0.5 text-[11px] text-emerald-light">
              {mockUser.role}
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="border border-border-default bg-[rgba(255,255,255,0.03)] text-[11px] text-text-muted hover:bg-[rgba(255,255,255,0.06)]"
          >
            Change Photo
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-x-3">
          <SettingsField label="First Name" defaultValue={mockUser.firstName} />
          <SettingsField label="Last Name" defaultValue={mockUser.lastName} />
        </div>
        <SettingsField label="Email" defaultValue={mockUser.email} />
        <SettingsField label="Phone" defaultValue={mockUser.phone} />
        <SettingsField label="Timezone" defaultValue={mockUser.timezone} />
        <Button className="mt-1 bg-emerald-dark text-white hover:bg-emerald-dark/90">
          Save Changes
        </Button>
      </div>

      {/* Notification Preferences */}
      <div className="rounded-xl border border-border-default bg-surface-card p-6">
        <SectionLabel>Notification Preferences</SectionLabel>
        <table className="mt-2 w-full border-collapse">
          <thead>
            <tr>
              <th className="pb-4 text-left" />
              {["Push", "SMS", "Email"].map((h) => (
                <th
                  key={h}
                  className="w-24 pb-4 text-center text-xs font-semibold text-text-muted"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {notifications.map((row, ri) => (
              <tr
                key={row.label}
                className="border-b border-border-light"
              >
                <td className="py-5 pr-6 text-[13px] text-text-primary">
                  {row.label}
                </td>
                {row.channels.map((checked, ci) => (
                  <td key={ci} className="py-5">
                    <div className="flex justify-center">
                      <button
                        type="button"
                        onClick={() => toggleNotification(ri, ci)}
                        className="flex cursor-pointer items-center justify-center p-1.5"
                      >
                        <span
                          className="flex items-center justify-center rounded"
                          style={{
                            width: 20,
                            height: 20,
                            border: checked
                              ? "2px solid #34d399"
                              : "2px solid rgba(255,255,255,0.4)",
                            background: checked
                              ? "#059669"
                              : "rgba(255,255,255,0.08)",
                          }}
                        >
                          {checked === 1 && (
                            <Check size={13} strokeWidth={3} className="text-white" />
                          )}
                        </span>
                      </button>
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <Button className="mt-8 bg-emerald-dark text-white hover:bg-emerald-dark/90">
          Save Preferences
        </Button>
      </div>
    </div>
  );
}

function SettingsField({
  label,
  defaultValue,
  disabled,
}: {
  label: string;
  defaultValue?: string;
  disabled?: boolean;
}) {
  return (
    <div className="mb-3.5">
      <label className="mb-1 block text-xs font-medium text-text-dim">
        {label}
      </label>
      <input
        defaultValue={defaultValue}
        disabled={disabled}
        className="w-full rounded-lg border border-border-default bg-[rgba(255,255,255,0.04)] px-3 py-[9px] text-[13px] text-text-primary outline-none disabled:opacity-60"
      />
    </div>
  );
}
