"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signIn } from "@/lib/supabase/auth";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setError(null);
    setLoading(true);
    const result = await signIn(formData);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  return (
    <div className="rounded-lg border border-border-default bg-surface-card p-6">
      <h2 className="text-lg font-semibold text-text-primary">Welcome back</h2>
      <p className="mt-1 text-sm text-text-muted">
        Sign in to your account
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
            autoComplete="current-password"
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
          {loading ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <div className="mt-4 space-y-2 text-center text-sm">
        <Link
          href="/magic-link"
          className="block text-text-muted hover:text-emerald-light transition-colors"
        >
          Sign in with magic link
        </Link>
        <p className="text-text-dim">
          Don&apos;t have an account?{" "}
          <Link
            href="/signup"
            className="text-emerald-light hover:underline"
          >
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
