"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
    event.preventDefault(); setBusy(true); setMessage(null);
    const supabase = createClient();
    if (!supabase) { setMessage("Supabase is not configured. Add the public URL and publishable key to the frontend environment."); setBusy(false); return; }
    const result = mode === "login" ? await supabase.auth.signInWithPassword({ email, password }) : await supabase.auth.signUp({ email, password, options: { data: { full_name: name } } });
    if (result.error) setMessage(result.error.message);
    else if (mode === "signup") setMessage("Account created. Check your email if verification is enabled, then sign in.");
    else router.push("/");
    setBusy(false);
  }

  return <main className="grid min-h-screen lg:grid-cols-[1.05fr_.95fr]"><section className="hidden bg-[#17202a] p-12 text-white lg:flex lg:flex-col lg:justify-between"><div><div className="text-2xl font-bold">Biz<span className="text-[#8da9ff]">Pilot</span></div><p className="mt-20 max-w-lg text-5xl font-semibold leading-[1.08] tracking-[-0.05em]">Run your entire small business from one place.</p><p className="mt-6 max-w-md text-base leading-7 text-white/60">Customers, invoices, expenses, payments, and performance—organized around the way you actually work.</p></div><div className="text-sm text-white/40">A calm operating system for ambitious small businesses.</div></section><section className="flex items-center justify-center bg-[#f6f8fb] p-6"><div className="w-full max-w-md"><Link href="/" className="text-sm font-semibold text-[#2557d6]">← Back to BizPilot</Link><div className="card mt-8 bg-white p-7 sm:p-9"><h1 className="text-2xl font-semibold tracking-tight">{mode === "login" ? "Welcome back" : "Create your workspace"}</h1><p className="mt-2 text-sm leading-6 text-[#687485]">{mode === "login" ? "Sign in to continue to your business workspace." : "Start organizing your business with BizPilot."}</p><form onSubmit={submit} className="mt-7 space-y-4">{mode === "signup" && <label className="block text-sm font-medium">Full name<input required value={name} onChange={(event) => setName(event.target.value)} className="focus-ring mt-2 w-full rounded-lg border border-[#e7ebf0] px-3 py-2.5 outline-none"/></label>}<label className="block text-sm font-medium">Email<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="focus-ring mt-2 w-full rounded-lg border border-[#e7ebf0] px-3 py-2.5 outline-none"/></label><label className="block text-sm font-medium">Password<input required minLength={8} type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="focus-ring mt-2 w-full rounded-lg border border-[#e7ebf0] px-3 py-2.5 outline-none"/></label>{message && <div role="alert" className="rounded-lg bg-[#f4f6fb] px-3 py-2.5 text-sm text-[#687485]">{message}</div>}<button disabled={busy} className="w-full rounded-lg bg-[#2557d6] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1d48b6] disabled:cursor-not-allowed disabled:opacity-60">{busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}</button></form><div className="mt-6 text-center text-sm text-[#687485]">{mode === "login" ? "New to BizPilot?" : "Already have an account?"} <button onClick={() => { setMode(mode === "login" ? "signup" : "login"); setMessage(null); }} className="font-semibold text-[#2557d6]">{mode === "login" ? "Create an account" : "Sign in"}</button></div></div></div></section></main>;
}
