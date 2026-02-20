"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Clock, Check, ChevronLeft, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionLabel } from "@/components/ui/section-label";
import { cn } from "@/lib/utils";
import { callEdgeFunction } from "@/lib/supabase/edge-functions";

const provinces = ["Alberta", "British Columbia", "Manitoba", "New Brunswick", "Newfoundland", "Nova Scotia", "Ontario", "PEI", "Quebec", "Saskatchewan"];
const usStates = ["California", "Florida", "Illinois", "New York", "Texas", "Washington", "Other"];
const caBusinessTypes = ["Corporation", "Sole Proprietorship", "Partnership", "Cooperative", "Non-Profit"];
const usBusinessTypes = ["LLC", "Corporation (C-Corp)", "Corporation (S-Corp)", "Sole Proprietorship", "Partnership", "Non-Profit"];
const industries = ["Financial Services", "Insurance", "Real Estate", "Mortgage Lending", "Investment Advisory", "Other"];

type Verification = {
  status: string;
  submitted_at: string | null;
  reviewed_at: string | null;
  legal_business_name: string | null;
  dba_name: string | null;
  business_type: string | null;
  industry: string | null;
  business_address: string | null;
  province_or_state: string | null;
  country: string | null;
  website_url: string | null;
  tax_id: string | null;
  state_registration_number: string | null;
  rep_full_name: string | null;
  rep_email: string | null;
  rep_phone: string | null;
  rep_job_title: string | null;
  rep_dob: string | null;
} | null;

function formatDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function VerificationClient({ verification }: { verification: Verification }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [step, setStep] = useState(1);
  const [country, setCountry] = useState<"CA" | "US">(
    (verification?.country as "CA" | "US") ?? "CA"
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSubmitted = verification?.status === "in_progress" || verification?.status === "verified";
  const isVerified = verification?.status === "verified";

  const handleSubmit = async () => {
    if (!formRef.current) return;
    const form = new FormData(formRef.current);
    setSubmitting(true);
    setError(null);

    const { error: err } = await callEdgeFunction("submit-verification", {
      legal_business_name: form.get("legal_business_name") as string,
      dba_name: form.get("dba_name") as string,
      business_type: form.get("business_type") as string,
      industry: form.get("industry") as string,
      business_address: form.get("business_address") as string,
      province_or_state: form.get("province_or_state") as string,
      country,
      website_url: form.get("website_url") as string,
      tax_id: form.get("tax_id") as string,
      state_registration_number: form.get("state_registration_number") as string,
      rep_full_name: form.get("rep_full_name") as string,
      rep_email: form.get("rep_email") as string,
      rep_phone: form.get("rep_phone") as string,
      rep_job_title: form.get("rep_job_title") as string,
      rep_dob: form.get("rep_dob") as string,
    });

    setSubmitting(false);
    if (err) {
      setError(err);
    } else {
      router.refresh();
    }
  };

  return (
    <div className="max-w-[580px]">
      {/* Status banner */}
      {isVerified ? (
        <div className="mb-4 flex items-center gap-2.5 rounded-[10px] border border-[rgba(52,211,153,0.15)] bg-emerald-bg px-[18px] py-3.5">
          <CheckCircle size={16} className="shrink-0 text-emerald-light" />
          <div>
            <div className="text-[13px] font-semibold text-emerald-light">Verified</div>
            <div className="text-[11px] text-text-dim">
              Business verification complete{verification?.reviewed_at ? ` · Reviewed ${formatDate(verification.reviewed_at)}` : ""}
            </div>
          </div>
        </div>
      ) : isSubmitted ? (
        <div className="mb-4 flex items-center gap-2.5 rounded-[10px] border border-[rgba(251,191,36,0.15)] bg-[rgba(251,191,36,0.06)] px-[18px] py-3.5">
          <Clock size={16} className="shrink-0 text-amber-light" />
          <div>
            <div className="text-[13px] font-semibold text-amber-light">Verification In Progress</div>
            <div className="text-[11px] text-text-dim">
              Submitted {formatDate(verification?.submitted_at ?? null)} &middot; Estimated 3–5 business days
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-4 flex items-center gap-2.5 rounded-[10px] border border-border-default bg-surface-card px-[18px] py-3.5">
          <Clock size={16} className="shrink-0 text-text-dim" />
          <div>
            <div className="text-[13px] font-semibold text-text-primary">Not Yet Verified</div>
            <div className="text-[11px] text-text-dim">
              Submit your business details to get verified
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-lg border border-[rgba(248,113,113,0.3)] bg-[rgba(248,113,113,0.08)] px-3 py-2 text-xs text-red-light">
          {error}
        </div>
      )}

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
            {i < 1 && <div className="h-px w-4 bg-border-default" />}
          </div>
        ))}
      </div>

      <form ref={formRef}>
        {/* Step 1: Business Details */}
        {step === 1 && (
          <div className="rounded-xl border border-border-default bg-surface-card p-6">
            <SectionLabel>Business Details</SectionLabel>

            {/* Country selector */}
            <div className="mb-[18px]">
              <label className="mb-1.5 block text-xs font-medium text-text-dim">Country</label>
              <div className="flex gap-1.5">
                {([["CA", "Canada"], ["US", "United States"]] as const).map(([code, label]) => (
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
                ))}
              </div>
            </div>

            <VField name="legal_business_name" label="Legal Business Name (as registered)" defaultValue={verification?.legal_business_name ?? ""} />
            <VField name="dba_name" label="DBA / Trade Name (if different)" defaultValue={verification?.dba_name ?? ""} />
            <div className="grid grid-cols-2 gap-x-3">
              <VField
                name="tax_id"
                label={country === "CA" ? "Business Number (BN)" : "EIN / Tax ID Number"}
                defaultValue={verification?.tax_id ?? ""}
              />
              <VSelect
                name="business_type"
                label="Business Type"
                defaultValue={verification?.business_type ?? (country === "CA" ? "Corporation" : "LLC")}
                options={country === "CA" ? caBusinessTypes : usBusinessTypes}
              />
            </div>
            <div className="grid grid-cols-2 gap-x-3">
              <VField
                name="state_registration_number"
                label={country === "CA" ? "Provincial Registration Number" : "State Registration Number"}
                defaultValue={verification?.state_registration_number ?? ""}
              />
              <VSelect
                name="province_or_state"
                label={country === "CA" ? "Province" : "State"}
                defaultValue={verification?.province_or_state ?? (country === "CA" ? "Ontario" : "California")}
                options={country === "CA" ? provinces : usStates}
              />
            </div>
            <VField name="business_address" label="Business Address" defaultValue={verification?.business_address ?? ""} />
            <div className="grid grid-cols-2 gap-x-3">
              <VField name="website_url" label="Website URL" defaultValue={verification?.website_url ?? ""} />
              <VSelect name="industry" label="Industry" defaultValue={verification?.industry ?? "Financial Services"} options={industries} />
            </div>

            <Button
              type="button"
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
                type="button"
                onClick={() => setStep(1)}
                className="flex rounded-lg bg-[rgba(255,255,255,0.05)] p-1.5 text-text-muted hover:text-text-primary"
              >
                <ChevronLeft size={16} />
              </button>
              <SectionLabel className="mb-0">Authorized Representative</SectionLabel>
            </div>
            <p className="mb-4 text-xs text-text-dim">
              This person will be the primary point of contact for verification and compliance matters.
            </p>
            <div className="grid grid-cols-2 gap-x-3">
              <VField name="rep_full_name" label="Full Legal Name" defaultValue={verification?.rep_full_name ?? ""} />
              <VField name="rep_job_title" label="Job Title" defaultValue={verification?.rep_job_title ?? ""} />
            </div>
            <div className="grid grid-cols-2 gap-x-3">
              <VField name="rep_email" label="Email Address" defaultValue={verification?.rep_email ?? ""} />
              <VField name="rep_phone" label="Phone Number" defaultValue={verification?.rep_phone ?? ""} />
            </div>
            <VField name="rep_dob" label="Date of Birth" defaultValue={verification?.rep_dob ?? ""} />
            <div className="mt-2 flex gap-2.5">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setStep(1)}
                className="flex-1 justify-center border border-border-default bg-[rgba(255,255,255,0.03)] py-2.5 text-text-muted hover:bg-[rgba(255,255,255,0.06)]"
              >
                Back
              </Button>
              <Button
                type="button"
                disabled={submitting}
                onClick={handleSubmit}
                className="flex-1 justify-center bg-emerald-dark py-2.5 text-white hover:bg-emerald-dark/90"
              >
                {submitting ? "Submitting..." : isSubmitted ? "Update & Resubmit" : "Submit Verification"}
              </Button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}

function VField({
  name,
  label,
  defaultValue,
  placeholder,
}: {
  name: string;
  label: string;
  defaultValue?: string;
  placeholder?: string;
}) {
  return (
    <div className="mb-3.5">
      <label className="mb-1 block text-xs font-medium text-text-dim">{label}</label>
      <input
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="w-full rounded-lg border border-border-default bg-[rgba(255,255,255,0.04)] px-3 py-[9px] text-[13px] text-text-primary outline-none"
      />
    </div>
  );
}

function VSelect({
  name,
  label,
  defaultValue,
  options,
}: {
  name: string;
  label: string;
  defaultValue: string;
  options: string[];
}) {
  return (
    <div className="mb-3.5">
      <label className="mb-1 block text-xs font-medium text-text-dim">{label}</label>
      <select
        name={name}
        defaultValue={defaultValue}
        className="w-full appearance-none rounded-lg border border-border-default bg-[rgba(255,255,255,0.04)] px-3 py-[9px] text-[13px] text-text-primary outline-none"
      >
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </div>
  );
}
