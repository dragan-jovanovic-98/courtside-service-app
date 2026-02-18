"use client";

import { useState } from "react";
import { Clock, Check, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionLabel } from "@/components/ui/section-label";
import { cn } from "@/lib/utils";

const provinces = ["Alberta", "British Columbia", "Manitoba", "New Brunswick", "Newfoundland", "Nova Scotia", "Ontario", "PEI", "Quebec", "Saskatchewan"];
const usStates = ["California", "Florida", "Illinois", "New York", "Texas", "Washington", "Other"];
const caBusinessTypes = ["Corporation", "Sole Proprietorship", "Partnership", "Cooperative", "Non-Profit"];
const usBusinessTypes = ["LLC", "Corporation (C-Corp)", "Corporation (S-Corp)", "Sole Proprietorship", "Partnership", "Non-Profit"];
const industries = ["Financial Services", "Insurance", "Real Estate", "Mortgage Lending", "Investment Advisory", "Other"];

export function VerificationClient() {
  const [step, setStep] = useState(1);
  const [country, setCountry] = useState<"CA" | "US">("CA");

  return (
    <div className="max-w-[580px]">
      {/* Status banner */}
      <div className="mb-4 flex items-center gap-2.5 rounded-[10px] border border-[rgba(251,191,36,0.15)] bg-[rgba(251,191,36,0.06)] px-[18px] py-3.5">
        <Clock size={16} className="shrink-0 text-amber-light" />
        <div>
          <div className="text-[13px] font-semibold text-amber-light">
            Verification In Progress
          </div>
          <div className="text-[11px] text-text-dim">
            Submitted Feb 10, 2026 &middot; Estimated 3–5 business days
          </div>
        </div>
      </div>

      {/* Step indicator */}
      <div className="mb-5 flex items-center gap-1">
        {["Business Details", "Authorized Representative"].map((s, i) => (
          <div key={s} className="flex items-center gap-1">
            <div
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-[5px] text-xs font-semibold",
                step > i + 1
                  ? "bg-emerald-bg text-emerald-light"
                  : step === i + 1
                    ? "bg-[rgba(255,255,255,0.1)] text-text-primary"
                    : "bg-[rgba(255,255,255,0.03)] text-text-dim"
              )}
            >
              {step > i + 1 ? <Check size={12} /> : <span>{i + 1}</span>}
              <span>{s}</span>
            </div>
            {i < 1 && (
              <div className="h-px w-4 bg-border-default" />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Business Details */}
      {step === 1 && (
        <div className="rounded-xl border border-border-default bg-surface-card p-6">
          <SectionLabel>Business Details</SectionLabel>

          {/* Country selector */}
          <div className="mb-[18px]">
            <label className="mb-1.5 block text-xs font-medium text-text-dim">
              Country
            </label>
            <div className="flex gap-1.5">
              {([["CA", "Canada"], ["US", "United States"]] as const).map(
                ([code, label]) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => setCountry(code)}
                    className={cn(
                      "flex-1 rounded-lg border-[1.5px] px-3.5 py-2.5 text-[13px] font-semibold transition-all",
                      country === code
                        ? "border-[rgba(52,211,153,0.4)] bg-emerald-bg text-emerald-light"
                        : "border-border-default bg-[rgba(255,255,255,0.02)] text-text-muted"
                    )}
                  >
                    {label}
                  </button>
                )
              )}
            </div>
          </div>

          <VField
            label="Legal Business Name (as registered)"
            defaultValue="Courtside Finance LLC"
          />
          <VField
            label="DBA / Trade Name (if different)"
            defaultValue="Courtside Finance"
          />
          <div className="grid grid-cols-2 gap-x-3">
            <VField
              label={country === "CA" ? "Business Number (BN)" : "EIN / Tax ID Number"}
              defaultValue={country === "CA" ? "123456789 RC0001" : "12-3456789"}
            />
            <VSelect
              label="Business Type"
              defaultValue={country === "CA" ? "Corporation" : "LLC"}
              options={country === "CA" ? caBusinessTypes : usBusinessTypes}
            />
          </div>
          <div className="grid grid-cols-2 gap-x-3">
            <VField
              label={country === "CA" ? "Provincial Registration Number" : "State Registration Number"}
              defaultValue={country === "CA" ? "ON-2024-CF-001234" : "S-2024-CF-005678"}
            />
            <VSelect
              label={country === "CA" ? "Province" : "State"}
              defaultValue={country === "CA" ? "Ontario" : "California"}
              options={country === "CA" ? provinces : usStates}
            />
          </div>
          <VField
            label="Business Address"
            defaultValue={
              country === "CA"
                ? "123 Finance St, Suite 400, Toronto, ON M5V 2T6"
                : "456 Market St, Suite 200, San Francisco, CA 94105"
            }
          />
          <div className="grid grid-cols-2 gap-x-3">
            <VField label="Website URL" defaultValue="https://courtsidefinance.com" />
            <VSelect label="Industry" defaultValue="Financial Services" options={industries} />
          </div>

          <Button
            onClick={() => setStep(2)}
            className="mt-2 w-full justify-center bg-emerald-dark py-2.5 text-white hover:bg-emerald-dark/90"
          >
            Continue to Representative
          </Button>
        </div>
      )}

      {/* Step 2: Authorized Representative */}
      {step === 2 && (
        <div className="rounded-xl border border-border-default bg-surface-card p-6">
          <div className="mb-4 flex items-center gap-2.5">
            <button
              onClick={() => setStep(1)}
              className="flex rounded-lg bg-[rgba(255,255,255,0.05)] p-1.5 text-text-muted hover:text-text-primary"
            >
              <ChevronLeft size={16} />
            </button>
            <SectionLabel className="mb-0">Authorized Representative</SectionLabel>
          </div>
          <p className="mb-4 text-xs text-text-dim">
            This person will be the primary point of contact for verification
            and compliance matters.
          </p>
          <div className="grid grid-cols-2 gap-x-3">
            <VField label="Full Legal Name" defaultValue="Alex Johnson" />
            <VField label="Job Title" defaultValue="CEO / Managing Director" />
          </div>
          <div className="grid grid-cols-2 gap-x-3">
            <VField
              label="Email Address"
              defaultValue="alex@courtsidefinance.com"
            />
            <VField label="Phone Number" defaultValue="(555) 123-4567" />
          </div>
          <VField label="Date of Birth" defaultValue="1988-05-15" />
          <div className="mt-2 flex gap-2.5">
            <Button
              variant="ghost"
              onClick={() => setStep(1)}
              className="flex-1 justify-center border border-border-default bg-[rgba(255,255,255,0.03)] py-2.5 text-text-muted hover:bg-[rgba(255,255,255,0.06)]"
            >
              Back
            </Button>
            <Button className="flex-1 justify-center bg-emerald-dark py-2.5 text-white hover:bg-emerald-dark/90">
              Submit Verification
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function VField({
  label,
  defaultValue,
  placeholder,
}: {
  label: string;
  defaultValue?: string;
  placeholder?: string;
}) {
  return (
    <div className="mb-3.5">
      <label className="mb-1 block text-xs font-medium text-text-dim">
        {label}
      </label>
      <input
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="w-full rounded-lg border border-border-default bg-[rgba(255,255,255,0.04)] px-3 py-[9px] text-[13px] text-text-primary outline-none"
      />
    </div>
  );
}

function VSelect({
  label,
  defaultValue,
  options,
}: {
  label: string;
  defaultValue: string;
  options: string[];
}) {
  return (
    <div className="mb-3.5">
      <label className="mb-1 block text-xs font-medium text-text-dim">
        {label}
      </label>
      <select
        defaultValue={defaultValue}
        className="w-full appearance-none rounded-lg border border-border-default bg-[rgba(255,255,255,0.04)] px-3 py-[9px] text-[13px] text-text-primary outline-none"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}
