"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SectionLabel } from "@/components/ui/section-label";
import { updateOrganization } from "@/lib/actions/settings";
import type { Organization } from "@/types";

export function OrganizationClient({ org }: { org: Organization | null }) {
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    const formData = new FormData(e.currentTarget);
    await updateOrganization(formData);
    setSaving(false);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-[520px] rounded-xl border border-border-default bg-surface-card p-6"
    >
      <SectionLabel>Organization Details</SectionLabel>
      <SettingsField label="Organization Name" name="name" defaultValue={org?.name ?? ""} />
      <div className="grid grid-cols-2 gap-x-3">
        <SettingsField label="Industry" name="industry" defaultValue={org?.industry ?? ""} />
        <SettingsField label="Business Type" name="businessType" defaultValue={org?.business_type ?? ""} />
      </div>
      <SettingsField label="Business Phone" name="phone" defaultValue={org?.business_phone ?? ""} />
      <SettingsField label="Website" name="website" defaultValue={org?.website ?? ""} />
      <SettingsField label="Address" name="address" defaultValue={org?.address ?? ""} />
      <Button
        type="submit"
        disabled={saving}
        className="mt-1 bg-emerald-dark text-white hover:bg-emerald-dark/90"
      >
        {saving ? "Saving..." : "Save Changes"}
      </Button>
    </form>
  );
}

function SettingsField({
  label,
  name,
  defaultValue,
}: {
  label: string;
  name: string;
  defaultValue?: string;
}) {
  return (
    <div className="mb-3.5">
      <label className="mb-1 block text-xs font-medium text-text-dim">
        {label}
      </label>
      <input
        name={name}
        defaultValue={defaultValue}
        className="w-full rounded-lg border border-border-default bg-[rgba(255,255,255,0.04)] px-3 py-[9px] text-[13px] text-text-primary outline-none"
      />
    </div>
  );
}
