"use client";

import { Button } from "@/components/ui/button";
import { SectionLabel } from "@/components/ui/section-label";
import { mockOrganization } from "@/lib/mock-data";

export function OrganizationClient() {
  return (
    <div className="max-w-[520px] rounded-xl border border-border-default bg-surface-card p-6">
      <SectionLabel>Organization Details</SectionLabel>
      <SettingsField label="Organization Name" defaultValue={mockOrganization.name} />
      <div className="grid grid-cols-2 gap-x-3">
        <SettingsField label="Industry" defaultValue={mockOrganization.industry} />
        <SettingsField label="Business Type" defaultValue={mockOrganization.businessType} />
      </div>
      <SettingsField label="Business Phone" defaultValue={mockOrganization.phone} />
      <SettingsField label="Website" defaultValue={mockOrganization.website} />
      <SettingsField label="Address" defaultValue={mockOrganization.address} />
      <Button className="mt-1 bg-emerald-dark text-white hover:bg-emerald-dark/90">
        Save Changes
      </Button>
    </div>
  );
}

function SettingsField({
  label,
  defaultValue,
}: {
  label: string;
  defaultValue?: string;
}) {
  return (
    <div className="mb-3.5">
      <label className="mb-1 block text-xs font-medium text-text-dim">
        {label}
      </label>
      <input
        defaultValue={defaultValue}
        className="w-full rounded-lg border border-border-default bg-[rgba(255,255,255,0.04)] px-3 py-[9px] text-[13px] text-text-primary outline-none"
      />
    </div>
  );
}
