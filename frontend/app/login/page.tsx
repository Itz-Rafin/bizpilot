"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setMessage(null);
    const supabase = createClient();
    if (!supabase) {
      setMessage("Supabase is not configured. Add the frontend environment values first.");
      setBusy(false);
      return;
    }

    try {
      const result =
        mode === "login"
          ? await supabase.auth.signInWithPassword({ email: email.trim(), password })
          : await supabase.auth.signUp({
              email: email.trim(),
              password,
              options: { data: { full_name: name.trim() } },
            });

      if (result.error) {
        setMessage(result.error.message);
        return;
      }

      if (mode === "signup") {
        if (result.data.session) {
          router.push("/onboarding");
        } else {
          setMessage("Account created. Check your email if verification is enabled, then sign in.");
        }
      } else {
        router.push("/");
      }
    } catch {
      setMessage("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const isLogin = mode === "login";

  return (
    <main className="min-h-screen bg-[#f6f8fb] lg:grid lg:grid-cols-[1.05fr_.95fr]">
      <section className="hidden bg-[#17202a] p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div>
          <div className="text-2xl font-bold tracking-tight">
            Biz<span className="text-[#8da9ff]">Pilot</span>
          </div>
          <div className="mt-24 max-w-xl">
            <p className="text-5xl font-semibold leading-[1.04] tracking-[-0.05em]">
              Run the business.
              <br />
              Keep the numbers clear.
            </p>
            <p className="mt-6 max-w-md text-base leading-7 text-white/60">
              Customers, invoices, payments, expenses, and performance in one calm workspace.
            </p>
          </div>
        </div>
        <p className="text-sm text-white/40">Simple tools for people running real businesses.</p>
      </section>

      <section className="flex items-center justify-center p-5 sm:p-8">
        <div className="w-full max-w-md">
          <Link href="/" className="text-sm font-semibold text-[#2557d6] hover:underline">
            ← Back to BizPilot
          </Link>

          <div className="card mt-6 bg-white p-7 sm:p-9">
            <div className="flex items-center gap-1 rounded-xl bg-[#f4f6fb] p-1 text-sm font-semibold">
              <button
                type="button"
                onClick={() => { setMode("login"); setMessage(null); }}
                className={`flex-1 rounded-lg px-3 py-2.5 transition ${isLogin ? "bg-white text-[#17202a] shadow-sm" : "text-[#8993a2]"}`}
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => { setMode("signup"); setMessage(null); }}
                className={`flex-1 rounded-lg px-3 py-2.5 transition ${!isLogin ? "bg-white text-[#17202a] shadow-sm" : "text-[#8993a2]"}`}
              >
                Create account
              </button>
            </div>

            <div className="mt-7">
              <h1 className="text-2xl font-semibold tracking-tight">
                {isLogin ? "Welcome back" : "Create your workspace"}
              </h1>
              <p className="mt-2 text-sm leading-6 text-[#687485]">
                {isLogin
                  ? "Sign in to continue to your business workspace."
                  : "Start organizing your business in a few simple steps."}
              </p>
            </div>

            <form onSubmit={submit} className="mt-7 space-y-4">
              {!isLogin && (
                <label className="block text-sm font-medium">
                  Full name
                  <input
                    required
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    className="field mt-2"
                    autoComplete="name"
                  />
                </label>
              )}

              <label className="block text-sm font-medium">
                Email
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="field mt-2"
                  autoComplete="email"
                />
              </label>

              <label className="block text-sm font-medium">
                Password
                <input
                  required
                  minLength={8}
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="field mt-2"
                  autoComplete={isLogin ? "current-password" : "new-password"}
                />
                {!isLogin && <span className="mt-1.5 block text-xs text-[#8993a2]">Use at least 8 characters.</span>}
              </label>

              {message && (
                <div role="alert" className="rounded-xl border border-[#e7ebf0] bg-[#f8fafc] px-3 py-2.5 text-sm text-[#687485]">
                  {message}
                </div>
              )}

              <button className="btn-primary w-full py-3" disabled={busy} type="submit">
                {busy ? "Please wait…" : isLogin ? "Sign in" : "Create account"}
              </button>
            </form>

            <p className="mt-6 text-center text-xs leading-5 text-[#8993a2]">
              By continuing, you agree to use BizPilot for lawful business activities and keep your account details secure.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
