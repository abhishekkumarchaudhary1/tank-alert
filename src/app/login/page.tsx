"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

type Step = "form" | "otp";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const verified = params.get("verified") === "true";

  const [tab, setTab] = useState<"signin" | "register">("signin");
  const [step, setStep] = useState<Step>("form");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [msg, setMsg] = useState(
    verified ? "Email verified! You can now sign in." : "",
  );
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMsg("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMsg(
        "Check your email for the verification link and temporary password.",
      );
      setTab("signin");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMsg("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMsg("OTP sent to your email.");
      setStep("otp");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOTP(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.push(data.role === "super_admin" ? "/admin" : "/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "OTP verification failed");
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-zinc-300 dark:focus:ring-zinc-600 text-zinc-900 dark:text-zinc-100";
  const btnClass =
    "rounded-xl bg-zinc-900 dark:bg-white px-4 py-3 text-sm font-semibold text-white dark:text-black hover:opacity-90 transition-opacity disabled:opacity-50";

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-zinc-100 dark:from-zinc-950 dark:to-black flex items-center justify-center p-4">
      <div className="w-full max-w-sm flex flex-col gap-5">
        {/* Logo */}
        <div className="text-center">
          <svg
            width="48"
            height="48"
            viewBox="0 0 100 120"
            fill="none"
            className="mx-auto mb-2"
          >
            <path
              d="M50 8C50 8 12 52 12 72C12 93 29 110 50 110C71 110 88 93 88 72C88 52 50 8 50 8Z"
              fill="#6ee7b7"
              stroke="#10b981"
              strokeWidth="3"
            />
          </svg>
          <h1 className="text-xl font-bold text-zinc-800 dark:text-zinc-200">
            Tank Alert
          </h1>
        </div>

        {step === "form" && (
          <>
            {/* Tabs */}
            <div className="flex rounded-xl bg-zinc-100 dark:bg-zinc-800 p-1">
              {(["signin", "register"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => {
                    setTab(t);
                    setError("");
                  }}
                  className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
                    tab === t
                      ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm"
                      : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                  }`}
                  type="button"
                >
                  {t === "signin" ? "Sign In" : "Register"}
                </button>
              ))}
            </div>

            {tab === "signin" ? (
              <form onSubmit={handleLogin} className="flex flex-col gap-3">
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className={inputClass}
                />
                <input
                  type="password"
                  placeholder="Temp password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className={inputClass}
                />
                <button type="submit" disabled={loading} className={btnClass}>
                  {loading ? "Signing in\u2026" : "Sign In"}
                </button>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="flex flex-col gap-3">
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className={inputClass}
                />
                <button type="submit" disabled={loading} className={btnClass}>
                  {loading ? "Registering\u2026" : "Register"}
                </button>
              </form>
            )}
          </>
        )}

        {step === "otp" && (
          <form onSubmit={handleVerifyOTP} className="flex flex-col gap-3">
            <p className="text-sm text-zinc-600 dark:text-zinc-400 text-center">
              Enter the 6-digit OTP sent to <strong>{email}</strong>
            </p>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              placeholder="000000"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              required
              className={`${inputClass} text-center text-lg tracking-[0.3em] font-mono`}
            />
            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className={btnClass}
            >
              {loading ? "Verifying\u2026" : "Verify OTP"}
            </button>
            <button
              type="button"
              onClick={() => {
                setStep("form");
                setOtp("");
              }}
              className="text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            >
              Back
            </button>
          </form>
        )}

        {msg && (
          <p className="text-sm text-emerald-600 dark:text-emerald-400 text-center bg-emerald-50 dark:bg-emerald-950/30 px-4 py-3 rounded-xl">
            {msg}
          </p>
        )}
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400 text-center bg-red-50 dark:bg-red-950/30 px-4 py-3 rounded-xl">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
