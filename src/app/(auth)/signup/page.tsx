"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signUp } from "@/lib/supabase/auth";

export default function SignupPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setError(null);
    setLoading(true);
    const result = await signUp(formData);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  return (
    <div className="rounded-lg border border-border-default bg-surface-card p-6">
      <h2 className="text-lg font-semibold text-text-primary">
        Create your account
      </h2>
      <p className="mt-1 text-sm text-text-muted">
        Get started with Courtside AI
      </p>

      <form action={handleSubmit} className="mt-6 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="firstName" className="text-text-muted">
              First name
            </Label>
            <Input
              id="firstName"
              name="firstName"
              placeholder="John"
              required
              autoComplete="given-name"
              className="border-border-default bg-surface-input text-text-primary placeholder:text-text-dim"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName" className="text-text-muted">
              Last name
            </Label>
            <Input
              id="lastName"
              name="lastName"
              placeholder="Smith"
              autoComplete="family-name"
              className="border-border-default bg-surface-input text-text-primary placeholder:text-text-dim"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="orgName" className="text-text-muted">
            Organization name
          </Label>
          <Input
            id="orgName"
            name="orgName"
            placeholder="Acme Mortgage"
            required
            className="border-border-default bg-surface-input text-text-primary placeholder:text-text-dim"
          />
        </div>

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

        <div className="space-y-2">
          <Label htmlFor="password" className="text-text-muted">
            Password
          </Label>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="••••••••"
            required
            minLength={8}
            autoComplete="new-password"
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
          {loading ? "Creating account…" : "Create account"}
        </Button>
      </form>

      <p className="mt-4 text-center text-sm text-text-dim">
        Already have an account?{" "}
        <Link href="/login" className="text-emerald-light hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
