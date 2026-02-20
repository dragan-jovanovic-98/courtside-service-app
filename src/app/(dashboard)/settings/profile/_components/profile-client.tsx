"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionLabel } from "@/components/ui/section-label";
import { updateProfile, updateNotificationPreferences } from "@/lib/actions/settings";
import type { User, Organization, NotificationPreference, Json } from "@/types";

type ProfileWithOrg = User & { organizations: Organization } | null;

const DEFAULT_NOTIF_PREFS: [string, [number, number, number]][] = [
  ["Appointment Booked", [1, 1, 1]],
  ["Hot Lead Alert", [1, 1, 0]],
  ["SMS Reply Received", [1, 0, 0]],
  ["Campaign Completed", [1, 0, 1]],
  ["Daily Summary Digest", [0, 0, 1]],
  ["Agent Status Change", [1, 0, 1]],
  ["Verification Update", [1, 0, 1]],
];

function parseNotifPrefs(
  prefs: NotificationPreference | null
): { label: string; channels: [number, number, number] }[] {
  if (!prefs?.preferences) {
    return DEFAULT_NOTIF_PREFS.map(([label, channels]) => ({
      label: label as string,
      channels: [...channels] as [number, number, number],
    }));
  }
  const raw = prefs.preferences as Json;
  if (Array.isArray(raw)) {
    return raw.map((item) => {
      const arr = item as [string, [number, number, number]];
      return {
        label: arr[0],
        channels: [...arr[1]] as [number, number, number],
      };
    });
  }
  return DEFAULT_NOTIF_PREFS.map(([label, channels]) => ({
    label: label as string,
    channels: [...channels] as [number, number, number],
  }));
}

export function ProfileClient({
  profile,
  notifPrefs,
}: {
  profile: ProfileWithOrg;
  notifPrefs: NotificationPreference | null;
}) {
  const [notifications, setNotifications] = useState(
    parseNotifPrefs(notifPrefs)
  );
  const [saving, setSaving] = useState(false);
  const [savingNotif, setSavingNotif] = useState(false);

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

  const initials = profile
    ? `${profile.first_name?.[0] ?? ""}${profile.last_name?.[0] ?? ""}`.toUpperCase()
    : "?";

  const handleSaveProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    const formData = new FormData(e.currentTarget);
    await updateProfile(formData);
    setSaving(false);
  };

  const handleSaveNotifications = async () => {
    setSavingNotif(true);
    const payload: Record<string, [number, number, number]> = {};
    for (const n of notifications) {
      payload[n.label] = n.channels;
    }
    await updateNotificationPreferences(payload);
    setSavingNotif(false);
  };

  return (
    <div className="max-w-[520px]">
      {/* Profile card */}
      <form
        onSubmit={handleSaveProfile}
        className="mb-4 rounded-xl border border-border-default bg-surface-card p-6"
      >
        <div className="mb-5 flex items-center gap-3.5">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-bg-strong text-lg font-bold text-emerald-light">
            {initials}
          </div>
          <div className="flex-1">
            <div className="text-base font-semibold text-text-primary">
              {profile?.first_name} {profile?.last_name}
            </div>
            <div className="text-xs text-text-dim">{profile?.email}</div>
            <div className="mt-0.5 text-[11px] text-emerald-light">
              {profile?.role ?? "Member"}
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="border border-border-default bg-[rgba(255,255,255,0.03)] text-[11px] text-text-muted hover:bg-[rgba(255,255,255,0.06)]"
          >
            Change Photo
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-x-3">
          <SettingsField
            label="First Name"
            name="firstName"
            defaultValue={profile?.first_name ?? ""}
          />
          <SettingsField
            label="Last Name"
            name="lastName"
            defaultValue={profile?.last_name ?? ""}
          />
        </div>
        <SettingsField
          label="Email"
          name="email"
          defaultValue={profile?.email ?? ""}
          disabled
        />
        <SettingsField
          label="Phone"
          name="phone"
          defaultValue={profile?.phone ?? ""}
        />
        <SettingsField
          label="Timezone"
          name="timezone"
          defaultValue={profile?.timezone ?? ""}
        />
        <Button
          type="submit"
          disabled={saving}
          className="mt-1 bg-emerald-dark text-white hover:bg-emerald-dark/90"
        >
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </form>

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
                            <Check
                              size={13}
                              strokeWidth={3}
                              className="text-white"
                            />
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
        <Button
          onClick={handleSaveNotifications}
          disabled={savingNotif}
          className="mt-8 bg-emerald-dark text-white hover:bg-emerald-dark/90"
        >
          {savingNotif ? "Saving..." : "Save Preferences"}
        </Button>
      </div>
    </div>
  );
}

function SettingsField({
  label,
  name,
  defaultValue,
  disabled,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  disabled?: boolean;
}) {
  return (
    <div className="mb-3.5">
      <label className="mb-1 block text-xs font-medium text-text-dim">
        {label}
      </label>
      <input
        name={name}
        defaultValue={defaultValue}
        disabled={disabled}
        className="w-full rounded-lg border border-border-default bg-[rgba(255,255,255,0.04)] px-3 py-[9px] text-[13px] text-text-primary outline-none disabled:opacity-60"
      />
    </div>
  );
}
