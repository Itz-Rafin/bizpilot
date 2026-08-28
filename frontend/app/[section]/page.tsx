"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, FileText, Settings, Sparkles } from "lucide-react";
import CustomerSection from "@/components/customer-section";
import InvoiceSection from "@/components/invoice-section";
import PaymentSection from "@/components/payment-section";
import CatalogSection from "@/components/catalog-section";
import ExpenseSection from "@/components/expense-section";
import { createApi, type ReportSummary } from "@/lib/api/client";
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
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(section === "reports");

  useEffect(() => {
    if (section !== "reports") return;
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const session = supabase ? (await supabase.auth.getSession()).data.session : null;
        const api = createApi(session?.access_token);
        const [context, data] = await Promise.all([api.workspace.me(), api.reports.summary()]);
        if (!cancelled) {
          setCurrency(context.organization?.currency ?? "USD");
          setReport(data);
        }
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "Unable to load reports");
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
            A clear view of how the business is doing.
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
          <div className="card mt-8 p-6 sm:p-7">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e9efff] text-[#2557d6]"><Settings size={18} /></div>
            <h2 className="mt-4 text-lg font-semibold">Workspace settings</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#687485]">
              Organization and team settings are protected by your workspace role and are managed from the authenticated workspace.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
