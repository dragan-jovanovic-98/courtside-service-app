"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SectionLabel } from "@/components/ui/section-label";
import { updateOrganization } from "@/lib/actions/settings";
import type { Organization } from "@/types";

const INDUSTRY_OPTIONS = [
  { value: "financial_services", label: "Financial Services" },
  { value: "mortgage_lending", label: "Mortgage Lending" },
  { value: "real_estate", label: "Real Estate" },
  { value: "insurance", label: "Insurance" },
  { value: "investment_advisory", label: "Investment Advisory" },
  { value: "other", label: "Other" },
];

const BUSINESS_TYPE_OPTIONS = [
  { value: "sole_proprietorship", label: "Sole Proprietorship" },
  { value: "llc", label: "LLC" },
  { value: "corporation", label: "Corporation" },
  { value: "partnership", label: "Partnership" },
  { value: "non_profit", label: "Non-Profit" },
  { value: "charity", label: "Charity" },
];

const TIMEZONE_OPTIONS = [
  { value: "America/New_York", label: "America/New_York (Eastern)" },
  { value: "America/Chicago", label: "America/Chicago (Central)" },
  { value: "America/Denver", label: "America/Denver (Mountain)" },
  { value: "America/Los_Angeles", label: "America/Los_Angeles (Pacific)" },
  { value: "America/Toronto", label: "America/Toronto (Eastern)" },
  { value: "America/Vancouver", label: "America/Vancouver (Pacific)" },
  { value: "America/Phoenix", label: "America/Phoenix (MST, no DST)" },
  { value: "Europe/London", label: "Europe/London (GMT/BST)" },
];

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
        <SettingsSelect
          label="Industry"
          name="industry"
          defaultValue={org?.industry ?? ""}
          options={INDUSTRY_OPTIONS}
          placeholder="Select industry..."
        />
        <SettingsSelect
          label="Business Type"
          name="businessType"
          defaultValue={org?.business_type ?? ""}
          options={BUSINESS_TYPE_OPTIONS}
          placeholder="Select type..."
        />
      </div>
      <SettingsField label="Business Phone" name="phone" defaultValue={org?.business_phone ?? ""} />
      <SettingsField label="Website" name="website" defaultValue={org?.website ?? ""} />
      <SettingsField label="Address" name="address" defaultValue={org?.address ?? ""} />
      <SettingsSelect
        label="Timezone"
        name="timezone"
        defaultValue={org?.timezone ?? ""}
        options={TIMEZONE_OPTIONS}
        placeholder="Select timezone..."
      />
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

function SettingsSelect({
  label,
  name,
  defaultValue,
  options,
  placeholder,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}) {
  return (
    <div className="mb-3.5">
      <label className="mb-1 block text-xs font-medium text-text-dim">
        {label}
      </label>
      <select
        name={name}
        defaultValue={defaultValue}
        className="w-full appearance-none rounded-lg border border-border-default bg-[rgba(255,255,255,0.04)] px-3 py-[9px] text-[13px] text-text-primary outline-none"
      >
        <option value="" disabled>
          {placeholder ?? "Select..."}
        </option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
