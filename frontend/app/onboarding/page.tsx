"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createApi } from "@/lib/api/client";
import { createClient } from "@/lib/supabase/client";

export default function OnboardingPage() {
  const router = useRouter();
  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState("Freelancer");
  const [currency, setCurrency] = useState("USD");
  const [timezone, setTimezone] = useState("UTC");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError(null);
    const supabase = createClient();
    const session = supabase ? (await supabase.auth.getSession()).data.session : null;
    if (!session) { setError("Your session has expired. Please sign in again."); setBusy(false); return; }
    try { await createApi(session.access_token).auth.bootstrap({ business_name: businessName, business_type: businessType, currency, timezone }); router.push("/"); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to complete onboarding"); setBusy(false); }
  }
  return <main className="flex min-h-screen items-center justify-center bg-[#f6f8fb] p-5"><div className="card w-full max-w-lg bg-white p-7 sm:p-9"><div className="text-xl font-bold">Biz<span className="text-[#2557d6]">Pilot</span></div><div className="mt-8"><div className="text-sm font-semibold text-[#2557d6]">Step 1 of 1</div><h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">Set up your workspace</h1><p className="mt-2 text-sm leading-6 text-[#687485]">These details shape your invoices, reports, and business settings. You can change them later.</p></div><form onSubmit={submit} className="mt-7 space-y-5"><label className="block text-sm font-medium">Business name<input required value={businessName} onChange={(event) => setBusinessName(event.target.value)} className="focus-ring mt-2 w-full rounded-lg border border-[#e7ebf0] px-3 py-2.5 outline-none" placeholder="Acme Creative Studio"/></label><label className="block text-sm font-medium">Business type<select value={businessType} onChange={(event) => setBusinessType(event.target.value)} className="focus-ring mt-2 w-full rounded-lg border border-[#e7ebf0] bg-white px-3 py-2.5 outline-none"><option>Freelancer</option><option>Agency</option><option>Consultant</option><option>Salon</option><option>Tutor</option><option>Repair Service</option><option>Retail</option><option>Other</option></select></label><div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-medium">Currency<select value={currency} onChange={(event) => setCurrency(event.target.value)} className="focus-ring mt-2 w-full rounded-lg border border-[#e7ebf0] bg-white px-3 py-2.5 outline-none"><option>USD</option><option>EUR</option><option>GBP</option><option>BDT</option><option>CAD</option><option>AUD</option></select></label><label className="block text-sm font-medium">Timezone<input required value={timezone} onChange={(event) => setTimezone(event.target.value)} className="focus-ring mt-2 w-full rounded-lg border border-[#e7ebf0] px-3 py-2.5 outline-none"/></label></div>{error && <div role="alert" className="rounded-lg bg-[#fff7f7] px-3 py-2.5 text-sm text-[#a73f3f]">{error}</div>}<button disabled={busy} className="w-full rounded-lg bg-[#2557d6] px-4 py-3 text-sm font-semibold text-white hover:bg-[#1d48b6] disabled:opacity-60">{busy ? "Setting up…" : "Complete setup"}</button></form></div></main>;
}
