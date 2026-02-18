import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        {/* Brand mark */}
        <div className="mb-8 text-center">
          <h1 className="font-brand text-2xl font-semibold text-emerald-light">
            Courtside AI
          </h1>
          <p className="mt-1 text-xs text-text-dim">
            AI-powered voice agents for financial services
          </p>
        </div>

        {children}
      </div>
    </div>
  );
}
