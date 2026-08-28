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
import { useEffect, useState } from "react";

const labels: Record<string, string> = { reports: "Reports", settings: "Settings" };
const icons: Record<string, typeof FileText> = { reports: Sparkles, settings: Settings };

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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (section !== "reports") return;
    (async () => {
      try {
        const supabase = createClient();
        const session = supabase ? (await supabase.auth.getSession()).data.session : null;
        setReport(await createApi(session?.access_token).reports.summary());
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Unable to load reports");
      }
    })();
  }, [section]);

  return <main className="min-h-screen bg-[#f6f8fb] p-5 text-[#17202a] sm:p-8"><div className="mx-auto max-w-6xl"><Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-[#2557d6] hover:underline"><ArrowLeft size={16}/> Back to overview</Link><div className="mt-8"><div className="flex items-center gap-2 text-sm font-semibold text-[#2557d6]"><Icon size={17}/>{title}</div><h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">{title}</h1><p className="mt-2 text-sm text-[#687485]">A clear view of how the business is doing.</p></div>{error && <div role="alert" className="mt-6 rounded-xl border border-[#f1cccc] bg-[#fff7f7] px-4 py-3 text-sm text-[#a73f3f]">{error}</div>}{section === "reports" && report ? <div className="mt-8 grid gap-5 sm:grid-cols-3"><div className="card p-5"><div className="text-sm text-[#687485]">Revenue</div><div className="mt-3 text-3xl font-semibold">${Number(report.revenue).toLocaleString()}</div></div><div className="card p-5"><div className="text-sm text-[#687485]">Expenses</div><div className="mt-3 text-3xl font-semibold">${Number(report.expenses).toLocaleString()}</div></div><div className="card p-5"><div className="text-sm text-[#687485]">Profit</div><div className="mt-3 text-3xl font-semibold">${Number(report.profit).toLocaleString()}</div></div><div className="card mt-1 p-5 sm:col-span-3"><div className="flex items-center justify-between"><h2 className="font-semibold">Revenue by customer</h2><span className="text-xs text-[#8993a2]">Current report period</span></div><div className="mt-5 space-y-3">{report.customer_revenue.length === 0 ? <p className="text-sm text-[#8993a2]">No paid revenue in this period yet.</p> : report.customer_revenue.map((item) => <div key={item.customer} className="flex justify-between rounded-xl bg-[#f8f9fc] px-4 py-3 text-sm"><span>{item.customer}</span><span className="font-semibold">${Number(item.revenue).toLocaleString()}</span></div>)}</div></div></div> : section === "settings" ? <div className="card mt-8 p-6"><h2 className="text-lg font-semibold">Workspace settings</h2><p className="mt-2 text-sm leading-6 text-[#687485]">Organization and team settings are protected by your workspace role and are managed from the authenticated workspace.</p></div> : null}</div></main>;
}
