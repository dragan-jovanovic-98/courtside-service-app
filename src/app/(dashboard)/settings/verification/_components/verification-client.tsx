"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Clock, Check, ChevronLeft, ChevronRight, CheckCircle, Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionLabel } from "@/components/ui/section-label";
import { cn } from "@/lib/utils";
import { callEdgeFunction } from "@/lib/supabase/edge-functions";

const provinces = ["Alberta", "British Columbia", "Manitoba", "New Brunswick", "Newfoundland", "Nova Scotia", "Ontario", "PEI", "Quebec", "Saskatchewan"];
const usStates = ["Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut", "Delaware", "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire", "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota", "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington", "West Virginia", "Wisconsin", "Wyoming"];
const caBusinessTypes = ["Corporation", "Sole Proprietorship", "Partnership", "Cooperative", "Non-Profit"];
const usBusinessTypes = ["LLC", "Corporation (C-Corp)", "Corporation (S-Corp)", "Sole Proprietorship", "Partnership", "Non-Profit"];
const industries = ["Financial Services", "Insurance", "Real Estate", "Mortgage Lending", "Investment Advisory", "Other"];

const CA_REG_TYPES = [
  { value: "bn", label: "Business Number (BN)" },
  { value: "provincial", label: "Provincial Registration" },
];

const US_REG_TYPES = [
  { value: "ein", label: "EIN / Tax ID Number" },
  { value: "state", label: "State Registration Number" },
];

function validateRegistrationNumber(regType: string, value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return "This field is required.";

  switch (regType) {
    case "bn": {
      // Canadian BN: 9 digits, optionally followed by 2-letter program ID and 4-digit account number
      const bnClean = trimmed.replace(/[\s-]/g, "");
      if (!/^\d{9}(\w{2}\d{4})?$/.test(bnClean)) {
        return "Business Number must be 9 digits (e.g., 123456789).";
      }
      return null;
    }
    case "provincial": {
      const provClean = trimmed.replace(/[\s-]/g, "");
      if (provClean.length < 4 || !/^[A-Za-z0-9]+$/.test(provClean)) {
        return "Enter a valid provincial registration number (at least 4 alphanumeric characters).";
      }
      return null;
    }
    case "ein": {
      // EIN format: XX-XXXXXXX
      const einClean = trimmed.replace(/[\s]/g, "");
      if (!/^\d{2}-?\d{7}$/.test(einClean)) {
        return "EIN must be in XX-XXXXXXX format (e.g., 12-3456789).";
      }
      return null;
    }
    case "state": {
      const stateClean = trimmed.replace(/[\s-]/g, "");
      if (stateClean.length < 4 || !/^[A-Za-z0-9]+$/.test(stateClean)) {
        return "Enter a valid state registration number (at least 4 alphanumeric characters).";
      }
      return null;
    }
    default:
      return null;
  }
}

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
  tax_id: string | null;
  state_registration_number: string | null;
  rep_full_name: string | null;
  rep_email: string | null;
  rep_phone: string | null;
  rep_job_title: string | null;
  rep_dob: string | null;
  registration_type: string | null;
} | null;

function formatDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function inferRegType(verification: Verification): string {
  if (!verification) return "";
  if (verification.registration_type) return verification.registration_type;
  // Infer from existing data for backwards compatibility
  const country = verification.country;
  if (country === "CA") {
    return verification.tax_id ? "bn" : verification.state_registration_number ? "provincial" : "";
  }
  return verification.tax_id ? "ein" : verification.state_registration_number ? "state" : "";
}

export function VerificationClient({ verification }: { verification: Verification }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [step, setStep] = useState(1);
  const [country, setCountry] = useState<"CA" | "US">(
    (verification?.country as "CA" | "US") ?? "CA"
  );
  const [regType, setRegType] = useState(inferRegType(verification));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const isSubmitted = verification?.status === "in_progress" || verification?.status === "verified";
  const isVerified = verification?.status === "verified";

  const regTypeOptions = country === "CA" ? CA_REG_TYPES : US_REG_TYPES;

  const handleCountryChange = (code: "CA" | "US") => {
    setCountry(code);
    setRegType("");
    setFieldErrors({});
  };

  const handleContinue = () => {
    if (!formRef.current) return;
    const form = new FormData(formRef.current);
    const errors: Record<string, string> = {};

    // Validate all step 1 required fields
    const legalName = (form.get("legal_business_name") as string)?.trim();
    if (!legalName) errors.legal_business_name = "Legal business name is required.";

    const businessAddress = (form.get("business_address") as string)?.trim();
    if (!businessAddress) errors.business_address = "Business address is required.";

    if (!regType) {
      errors.registration_type = "Please select a registration type.";
    } else {
      const regValue = regType === "bn" || regType === "ein"
        ? (form.get("tax_id") as string)
        : (form.get("state_registration_number") as string);
      const regError = validateRegistrationNumber(regType, regValue || "");
      if (regError) {
        const fieldName = regType === "bn" || regType === "ein" ? "tax_id" : "state_registration_number";
        errors[fieldName] = regError;
      }
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setStep(2);
  };

  const handleSubmit = async () => {
    if (!formRef.current) return;
    const form = new FormData(formRef.current);

    // Validate step 2 required fields
    const errors: Record<string, string> = {};
    const repName = (form.get("rep_full_name") as string)?.trim();
    const repEmail = (form.get("rep_email") as string)?.trim();
    const repPhone = (form.get("rep_phone") as string)?.trim();
    const repTitle = (form.get("rep_job_title") as string)?.trim();
    const repDob = (form.get("rep_dob") as string)?.trim();

    if (!repName) errors.rep_full_name = "Full name is required.";
    if (!repEmail) errors.rep_email = "Email is required.";
    if (!repPhone) errors.rep_phone = "Phone number is required.";
    if (!repTitle) errors.rep_job_title = "Job title is required.";
    if (!repDob) errors.rep_dob = "Date of birth is required.";

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setSubmitting(true);
    setError(null);
    setFieldErrors({});

    const { error: err } = await callEdgeFunction("submit-verification", {
      legal_business_name: form.get("legal_business_name") as string,
      dba_name: form.get("dba_name") as string,
      business_type: form.get("business_type") as string,
      industry: form.get("industry") as string,
      business_address: form.get("business_address") as string,
      province_or_state: form.get("province_or_state") as string,
      country,
      tax_id: form.get("tax_id") as string,
      state_registration_number: form.get("state_registration_number") as string,
      registration_type: regType,
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

  // Determine which registration field to show based on regType
  const regFieldLabel =
    regType === "bn" ? "Business Number (BN)"
    : regType === "provincial" ? "Provincial Registration Number"
    : regType === "ein" ? "EIN / Tax ID Number"
    : regType === "state" ? "State Registration Number"
    : "";

  const regFieldName = regType === "bn" || regType === "ein" ? "tax_id" : "state_registration_number";

  const regFieldPlaceholder =
    regType === "bn" ? "123456789"
    : regType === "ein" ? "12-3456789"
    : regType === "provincial" ? "e.g., BC-1234567"
    : regType === "state" ? "e.g., S12345678"
    : "";

  const regFieldDefault =
    regType === "bn" || regType === "ein"
      ? (verification?.tax_id ?? "")
      : (verification?.state_registration_number ?? "");

  // Whether to show province/state selector (always for provincial/state reg, optional otherwise)
  const showProvinceState = regType === "provincial" || regType === "state";

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
        {/* Step 1: Business Details — always rendered, hidden when not active */}
        <div className={step === 1 ? "" : "hidden"}>
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
                    onClick={() => handleCountryChange(code)}
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

            <VField
              name="legal_business_name"
              label="Legal Business Name (as registered)"
              defaultValue={verification?.legal_business_name ?? ""}
              error={fieldErrors.legal_business_name}
            />
            <VField name="dba_name" label="DBA / Trade Name (if different)" defaultValue={verification?.dba_name ?? ""} />
            <div className="grid grid-cols-2 gap-x-3">
              <VSelect
                name="business_type"
                label="Business Type"
                defaultValue={verification?.business_type ?? (country === "CA" ? "Corporation" : "LLC")}
                options={country === "CA" ? caBusinessTypes : usBusinessTypes}
              />
              <VSelect name="industry" label="Industry" defaultValue={verification?.industry ?? "Financial Services"} options={industries} />
            </div>

            {/* Registration Type */}
            <div className="mb-3.5">
              <label className="mb-1 block text-xs font-medium text-text-dim">Registration Type</label>
              <select
                value={regType}
                onChange={(e) => { setRegType(e.target.value); setFieldErrors({}); }}
                className="w-full appearance-none rounded-lg border border-border-default bg-[rgba(255,255,255,0.04)] px-3 py-[9px] text-[13px] text-text-primary outline-none"
              >
                <option value="" disabled>Select registration type...</option>
                {regTypeOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              {fieldErrors.registration_type && (
                <p className="mt-1 text-[11px] text-red-light">{fieldErrors.registration_type}</p>
              )}
            </div>

            {/* Dynamic registration fields */}
            {regType && (
              <div className={showProvinceState ? "grid grid-cols-2 gap-x-3" : ""}>
                <VField
                  key={`${regType}-reg-field`}
                  name={regFieldName}
                  label={regFieldLabel}
                  defaultValue={regFieldDefault}
                  placeholder={regFieldPlaceholder}
                  error={fieldErrors.tax_id || fieldErrors.state_registration_number}
                />
                {showProvinceState && (
                  <VSelect
                    name="province_or_state"
                    label={country === "CA" ? "Province" : "State"}
                    defaultValue={verification?.province_or_state ?? (country === "CA" ? "Ontario" : "California")}
                    options={country === "CA" ? provinces : usStates}
                  />
                )}
              </div>
            )}

            <VField
              name="business_address"
              label="Business Address"
              defaultValue={verification?.business_address ?? ""}
              error={fieldErrors.business_address}
            />

            <Button
              type="button"
              onClick={handleContinue}
              className="mt-2 w-full justify-center bg-emerald-dark py-2.5 text-white hover:bg-emerald-dark/90"
            >
              Continue to Representative
            </Button>
          </div>
        </div>

        {/* Step 2: Authorized Representative — always rendered, hidden when not active */}
        <div className={step === 2 ? "" : "hidden"}>
          <div className="rounded-xl border border-border-default bg-surface-card p-6">
            <div className="mb-4 flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => { setStep(1); setFieldErrors({}); }}
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
              <VField
                name="rep_full_name"
                label="Full Legal Name"
                defaultValue={verification?.rep_full_name ?? ""}
                error={fieldErrors.rep_full_name}
              />
              <VField
                name="rep_job_title"
                label="Job Title"
                defaultValue={verification?.rep_job_title ?? ""}
                error={fieldErrors.rep_job_title}
              />
            </div>
            <div className="grid grid-cols-2 gap-x-3">
              <VField
                name="rep_email"
                label="Email Address"
                defaultValue={verification?.rep_email ?? ""}
                error={fieldErrors.rep_email}
              />
              <VField
                name="rep_phone"
                label="Phone Number"
                defaultValue={verification?.rep_phone ?? ""}
                error={fieldErrors.rep_phone}
              />
            </div>
            <VDatePicker
              name="rep_dob"
              label="Date of Birth"
              defaultValue={verification?.rep_dob ?? ""}
              error={fieldErrors.rep_dob}
            />
            <div className="mt-2 flex gap-2.5">
              <Button
                type="button"
                variant="ghost"
                onClick={() => { setStep(1); setFieldErrors({}); }}
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
        </div>
      </form>
    </div>
  );
}

function VField({
  name,
  label,
  defaultValue,
  placeholder,
  error,
}: {
  name: string;
  label: string;
  defaultValue?: string;
  placeholder?: string;
  error?: string;
}) {
  return (
    <div className="mb-3.5">
      <label className="mb-1 block text-xs font-medium text-text-dim">{label}</label>
      <input
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className={cn(
          "w-full rounded-lg border bg-[rgba(255,255,255,0.04)] px-3 py-[9px] text-[13px] text-text-primary outline-none",
          error ? "border-[rgba(248,113,113,0.5)]" : "border-border-default"
        )}
      />
      {error && <p className="mt-1 text-[11px] text-red-light">{error}</p>}
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

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_FULL = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function VDatePicker({
  name,
  label,
  defaultValue,
  error,
}: {
  name: string;
  label: string;
  defaultValue?: string;
  error?: string;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(defaultValue ?? "");
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse initial date or default to a reasonable starting point
  const parsed = value ? new Date(value) : null;
  const [viewYear, setViewYear] = useState(parsed ? parsed.getFullYear() : 1990);
  const [viewMonth, setViewMonth] = useState(parsed ? parsed.getMonth() : 0);

  const selectedDay = parsed && parsed.getFullYear() === viewYear && parsed.getMonth() === viewMonth
    ? parsed.getDate() : null;

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);

  const today = new Date();
  const minYear = today.getFullYear() - 100;
  const maxYear = today.getFullYear() - 16; // must be at least 16
  const years = Array.from({ length: maxYear - minYear + 1 }, (_, i) => maxYear - i);

  const handleSelect = useCallback((day: number) => {
    const m = String(viewMonth + 1).padStart(2, "0");
    const d = String(day).padStart(2, "0");
    setValue(`${viewYear}-${m}-${d}`);
    setOpen(false);
  }, [viewYear, viewMonth]);

  const formatDisplay = (val: string) => {
    if (!val) return "";
    const p = new Date(val + "T00:00:00");
    if (isNaN(p.getTime())) return val;
    return `${MONTHS_FULL[p.getMonth()]} ${p.getDate()}, ${p.getFullYear()}`;
  };

  // Close on outside click
  const handleBlur = useCallback((e: React.FocusEvent) => {
    if (containerRef.current && !containerRef.current.contains(e.relatedTarget as Node)) {
      setOpen(false);
    }
  }, []);

  return (
    <div className="relative mb-3.5" ref={containerRef} onBlur={handleBlur}>
      <label className="mb-1 block text-xs font-medium text-text-dim">{label}</label>
      <input type="hidden" name={name} value={value} />
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          "flex w-full items-center justify-between rounded-lg border bg-[rgba(255,255,255,0.04)] px-3 py-[9px] text-left text-[13px] outline-none",
          error ? "border-[rgba(248,113,113,0.5)]" : "border-border-default",
          value ? "text-text-primary" : "text-text-dim"
        )}
      >
        <span>{value ? formatDisplay(value) : "Select date..."}</span>
        <CalendarIcon size={14} className="text-text-dim" />
      </button>
      {error && <p className="mt-1 text-[11px] text-red-light">{error}</p>}

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-[280px] rounded-xl border border-border-default bg-[#161b22] p-3 shadow-xl">
          {/* Month & Year dropdowns */}
          <div className="mb-2.5 flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
                else setViewMonth(viewMonth - 1);
              }}
              className="rounded p-1 text-text-muted hover:bg-[rgba(255,255,255,0.08)] hover:text-text-primary"
            >
              <ChevronLeft size={14} />
            </button>
            <select
              value={viewMonth}
              onChange={(e) => setViewMonth(Number(e.target.value))}
              className="flex-1 appearance-none rounded border border-border-default bg-[rgba(255,255,255,0.04)] px-2 py-1 text-center text-xs font-semibold text-text-primary outline-none"
            >
              {MONTHS_FULL.map((m, i) => (
                <option key={m} value={i}>{m}</option>
              ))}
            </select>
            <select
              value={viewYear}
              onChange={(e) => setViewYear(Number(e.target.value))}
              className="w-[72px] appearance-none rounded border border-border-default bg-[rgba(255,255,255,0.04)] px-2 py-1 text-center text-xs font-semibold text-text-primary outline-none"
            >
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => {
                if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
                else setViewMonth(viewMonth + 1);
              }}
              className="rounded p-1 text-text-muted hover:bg-[rgba(255,255,255,0.08)] hover:text-text-primary"
            >
              <ChevronRight size={14} />
            </button>
          </div>

          {/* Day headers */}
          <div className="mb-1 grid grid-cols-7 gap-0">
            {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
              <div key={d} className="py-1 text-center text-[10px] font-semibold text-text-dim">{d}</div>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7 gap-0">
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
              const isSelected = day === selectedDay;
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => handleSelect(day)}
                  className={cn(
                    "mx-auto flex h-8 w-8 items-center justify-center rounded-full text-xs transition-colors",
                    isSelected
                      ? "bg-emerald-dark font-semibold text-white"
                      : "text-text-primary hover:bg-[rgba(255,255,255,0.1)]"
                  )}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
