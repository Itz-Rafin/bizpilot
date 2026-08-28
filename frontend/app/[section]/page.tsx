"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, FileText, Save, Settings, Sparkles } from "lucide-react";
import CustomerSection from "@/components/customer-section";
import InvoiceSection from "@/components/invoice-section";
import PaymentSection from "@/components/payment-section";
import CatalogSection from "@/components/catalog-section";
import ExpenseSection from "@/components/expense-section";
import { createApi, type OrganizationSettings, type ReportSummary } from "@/lib/api/client";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useMemo, useState } from "react";

const labels: Record<string, string> = { reports: "Reports", settings: "Settings" };
const icons: Record<string, typeof FileText> = { reports: Sparkles, settings: Settings };

function money(value: string | number | undefined, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0));
}

export default function SectionPage() {
  const { section } = useParams<{ section: string }>();
  if (section === "customers") return <CustomerSection />;
  if (section === "invoices") return <InvoiceSection />;
  if (section === "payments") return <PaymentSection />;
  if (section === "products") return <CatalogSection kind="products" />;
  if (section === "services") return <CatalogSection kind="services" />;
  if (section === "expenses") return <ExpenseSection />;
  return <RemainingSection section={section} />;
}

function RemainingSection({ section }: { section: string }) {
  const title = labels[section] ?? "Workspace";
  const Icon = icons[section] ?? Settings;
  const [report, setReport] = useState<ReportSummary | null>(null);
  const [currency, setCurrency] = useState("USD");
  const [settings, setSettings] = useState<OrganizationSettings | null>(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "", address: "", business_type: "", currency: "USD", timezone: "UTC" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(section === "reports" || section === "settings");
  const [saving, setSaving] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const canEditSettings = section === "settings" && !!settings && ["owner", "admin"].includes(role ?? "");

  useEffect(() => {
    let cancelled = false;
    if (section !== "reports" && section !== "settings") return;
    (async () => {
      try {
        const supabase = createClient();
        const session = supabase ? (await supabase.auth.getSession()).data.session : null;
        const api = createApi(session?.access_token);
        if (section === "reports") {
          const [context, data] = await Promise.all([api.workspace.me(), api.reports.summary()]);
          if (!cancelled) {
            setCurrency(context.organization?.currency ?? "USD");
            setReport(data);
            setRole(context.role);
          }
        } else {
          const [context, data] = await Promise.all([api.workspace.me(), api.workspace.getSettings()]);
          if (!cancelled) {
            setRole(context.role);
            setSettings(data);
            setForm({
              name: data.name,
              email: data.email ?? "",
              phone: data.phone ?? "",
              address: data.address ?? "",
              business_type: data.business_type ?? "",
              currency: data.currency,
              timezone: data.timezone,
            });
          }
        }
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : section === "reports" ? "Unable to load reports" : "Unable to load settings");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [section]);

  const summary = useMemo(() => {
    if (!report) return null;
    return [
      { label: "Revenue", value: report.revenue, note: "Payments received" },
      { label: "Expenses", value: report.expenses, note: "Recorded costs" },
      { label: "Profit", value: report.profit, note: "Revenue less expenses" },
    ];
  }, [report]);

  async function saveSettings(event: React.FormEvent) {
    event.preventDefault();
    if (!settings || !canEditSettings || saving || !form.name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const supabase = createClient();
      const session = supabase ? (await supabase.auth.getSession()).data.session : null;
      const updated = await createApi(session?.access_token).workspace.updateSettings({
        name: form.name.trim(),
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        address: form.address.trim() || undefined,
        business_type: form.business_type.trim() || undefined,
        currency: form.currency,
        timezone: form.timezone.trim(),
      });
      setSettings(updated);
      setForm({
        name: updated.name,
        email: updated.email ?? "",
        phone: updated.phone ?? "",
        address: updated.address ?? "",
        business_type: updated.business_type ?? "",
        currency: updated.currency,
        timezone: updated.timezone,
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save settings");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f6f8fb] p-5 text-[#17202a] sm:p-8">
      <div className="mx-auto max-w-6xl">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-[#2557d6] hover:underline">
          <ArrowLeft size={16} /> Back to overview
        </Link>

        <div className="mt-8">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#2557d6]"><Icon size={17} />{title}</div>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">{title}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#687485]">
            {section === "settings" ? "Keep your workspace identity, contact details, currency, and timezone accurate." : "A clear view of how the business is doing."}
          </p>
        </div>

        {error && <div role="alert" className="mt-6 rounded-xl border border-[#f1cccc] bg-[#fff7f7] px-4 py-3 text-sm text-[#a73f3f]">{error}</div>}

        {section === "reports" && (
          loading ? (
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {[1, 2, 3].map((item) => <div key={item} className="card h-32 animate-pulse bg-[#eef1f5]" />)}
            </div>
          ) : report && summary ? (
            <div className="mt-8 space-y-5">
              <div className="grid gap-4 sm:grid-cols-3">
                {summary.map((item) => (
                  <div key={item.label} className="card card-hover p-5">
                    <div className="text-sm font-medium text-[#687485]">{item.label}</div>
                    <div className="metric-value mt-3 text-3xl font-semibold">{money(item.value, currency)}</div>
                    <div className="mt-2 text-xs text-[#8993a2]">{item.note}</div>
                  </div>
                ))}
              </div>

              <div className="card overflow-hidden p-5 sm:p-6">
                <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                  <div>
                    <h2 className="font-semibold">Revenue by customer</h2>
                    <p className="mt-1 text-xs text-[#8993a2]">Paid revenue in the current report period.</p>
                  </div>
                  <span className="rounded-full bg-[#f4f6fb] px-3 py-1.5 text-xs font-semibold text-[#687485]">{currency}</span>
                </div>
                <div className="mt-5 overflow-hidden rounded-xl border border-[#eef1f5]">
                  {report.customer_revenue.length === 0 ? (
                    <div className="px-5 py-12 text-center text-sm text-[#8993a2]">No paid revenue in this period yet.</div>
                  ) : (
                    report.customer_revenue.map((item, index) => (
                      <div key={item.customer} className={`flex items-center justify-between gap-4 px-4 py-3.5 text-sm ${index !== 0 ? "border-t border-[#eef1f5]" : ""}`}>
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#e9efff] text-[11px] font-bold text-[#2557d6]">{item.customer.slice(0, 2).toUpperCase()}</div>
                          <span className="truncate font-medium">{item.customer}</span>
                        </div>
                        <span className="font-semibold">{money(item.revenue, currency)}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : null
        )}

        {section === "settings" && (
          loading ? (
            <div className="card mt-8 h-96 animate-pulse bg-[#eef1f5]" />
          ) : settings ? (
            <form onSubmit={saveSettings} className="card mt-8 p-6 sm:p-7">
              <div className="flex flex-col justify-between gap-3 border-b border-[#eef1f5] pb-5 sm:flex-row sm:items-start">
                <div>
                  <h2 className="text-lg font-semibold">Organization profile</h2>
                  <p className="mt-1 text-sm leading-6 text-[#687485]">These details appear across your workspace and business documents.</p>
                </div>
                <span className="rounded-full bg-[#f4f6fb] px-3 py-1.5 text-xs font-semibold capitalize text-[#687485]">{role ?? "member"}</span>
              </div>

              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <label className="block text-sm font-medium sm:col-span-2">
                  Business name
                  <input className="field mt-2" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} disabled={!canEditSettings} required />
                </label>
                <label className="block text-sm font-medium">
                  Email
                  <input className="field mt-2" type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} disabled={!canEditSettings} />
                </label>
                <label className="block text-sm font-medium">
                  Phone
                  <input className="field mt-2" value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} disabled={!canEditSettings} />
                </label>
                <label className="block text-sm font-medium sm:col-span-2">
                  Address
                  <input className="field mt-2" value={form.address} onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))} disabled={!canEditSettings} />
                </label>
                <label className="block text-sm font-medium">
                  Business type
                  <input className="field mt-2" value={form.business_type} onChange={(event) => setForm((current) => ({ ...current, business_type: event.target.value }))} disabled={!canEditSettings} placeholder="Retail, agency, consulting…" />
                </label>
                <label className="block text-sm font-medium">
                  Currency
                  <select className="field mt-2" value={form.currency} onChange={(event) => setForm((current) => ({ ...current, currency: event.target.value }))} disabled={!canEditSettings}>
                    <option value="USD">USD — US Dollar</option>
                    <option value="BDT">BDT — Bangladeshi Taka</option>
                    <option value="EUR">EUR — Euro</option>
                    <option value="GBP">GBP — Pound Sterling</option>
                    <option value="INR">INR — Indian Rupee</option>
                    <option value="AED">AED — UAE Dirham</option>
                    <option value="SGD">SGD — Singapore Dollar</option>
                    <option value="AUD">AUD — Australian Dollar</option>
                    <option value="CAD">CAD — Canadian Dollar</option>
                  </select>
                </label>
                <label className="block text-sm font-medium">
                  Timezone
                  <input className="field mt-2" value={form.timezone} onChange={(event) => setForm((current) => ({ ...current, timezone: event.target.value }))} disabled={!canEditSettings} placeholder="Asia/Dhaka" required />
                </label>
              </div>

              {canEditSettings ? (
                <div className="mt-7 flex justify-end">
                  <button type="submit" className="btn-primary" disabled={saving || !form.name.trim()}>
                    <Save size={16} />
                    {saving ? "Saving…" : "Save changes"}
                  </button>
                </div>
              ) : (
                <div className="mt-7 rounded-xl bg-[#f6f8fb] px-4 py-3 text-sm text-[#687485]">
                  Only workspace owners and admins can edit organization settings.
                </div>
              )}
            </form>
          ) : null
        )}
      </div>
    </main>
  );
}