"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signInWithMagicLink } from "@/lib/supabase/auth";

export default function MagicLinkPage() {
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setError(null);
    setLoading(true);
    const result = await signInWithMagicLink(formData);
    if (result?.error) {
      setError(result.error);
    } else {
      setSent(true);
    }
    setLoading(false);
  }

  if (sent) {
    return (
      <div className="rounded-lg border border-border-default bg-surface-card p-6 text-center">
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-emerald-bg">
          <svg
            className="size-6 text-emerald-light"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-text-primary">
          Check your email
        </h2>
        <p className="mt-2 text-sm text-text-muted">
          We sent a magic link to your email. Click the link to sign in.
        </p>
        <Link
          href="/login"
          className="mt-4 inline-block text-sm text-emerald-light hover:underline"
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border-default bg-surface-card p-6">
      <h2 className="text-lg font-semibold text-text-primary">Magic link</h2>
      <p className="mt-1 text-sm text-text-muted">
        We&apos;ll email you a link to sign in — no password needed
      </p>

      <form action={handleSubmit} className="mt-6 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-text-muted">
            Email
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="you@company.com"
            required
            autoComplete="email"
            className="border-border-default bg-surface-input text-text-primary placeholder:text-text-dim"
          />
        </div>

        {error && (
          <p className="text-sm text-red-light">{error}</p>
        )}

        <Button
          type="submit"
          disabled={loading}
          className="w-full bg-emerald-dark text-white hover:bg-emerald-dark/90"
        >
          {loading ? "Sending…" : "Send magic link"}
        </Button>
      </form>

      <p className="mt-4 text-center text-sm text-text-dim">
        <Link href="/login" className="text-emerald-light hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
