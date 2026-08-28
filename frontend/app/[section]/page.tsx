"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, FileText, Package, Receipt, Settings, Sparkles, Wrench } from "lucide-react";
import { useEffect, useState } from "react";
import CustomerSection from "@/components/customer-section";
import InvoiceSection from "@/components/invoice-section";
import { createApi, type Expense, type Product, type ReportSummary, type Service } from "@/lib/api/client";
import { createClient } from "@/lib/supabase/client";

const labels: Record<string, string> = {
  invoices: "Invoices",
  products: "Products",
  services: "Services",
  expenses: "Expenses",
  reports: "Reports",
  settings: "Settings",
};

const icons: Record<string, typeof FileText> = {
  invoices: FileText,
  products: Package,
  services: Wrench,
  expenses: Receipt,
  reports: Sparkles,
  settings: Settings,
};

export default function SectionPage() {
  const { section } = useParams<{ section: string }>();
  if (section === "customers") return <CustomerSection />;
  if (section === "invoices") return <InvoiceSection />;

  return <RemainingSection section={section} />;
}

function RemainingSection({ section }: { section: string }) {
  const title = labels[section] ?? "Workspace";
  const Icon = icons[section] ?? Settings;
  const [rows, setRows] = useState<Array<Product | Service | Expense>>([]);
  const [report, setReport] = useState<ReportSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient();
        const session = supabase ? (await supabase.auth.getSession()).data.session : null;
        const api = createApi(session?.access_token);
        if (section === "reports") setReport(await api.reports.summary());
        else if (section === "products") setRows(await api.products.list());
        else if (section === "services") setRows(await api.services.list());
        else if (section === "expenses") setRows(await api.expenses.list());
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Unable to load this workspace section");
      }
    }
    load();
  }, [section]);

  return (
    <main className="min-h-screen bg-[#f6f8fb] p-5 text-[#17202a] sm:p-8">
      <div className="mx-auto max-w-6xl">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-[#2557d6] hover:underline"><ArrowLeft size={16} /> Back to overview</Link>
        <div className="mt-8 flex items-end justify-between gap-4">
          <div><div className="flex items-center gap-2 text-sm font-semibold text-[#2557d6]"><Icon size={17} />{title}</div><h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">{title}</h1><p className="mt-2 text-sm text-[#687485]">A focused view of your business data.</p></div>
          {section !== "settings" && section !== "reports" && <button className="btn-primary">Add {title.slice(0, -1)}</button>}
        </div>
        {error && <div role="alert" className="mt-6 rounded-xl border border-[#f1cccc] bg-[#fff7f7] px-4 py-3 text-sm text-[#a73f3f]">{error}</div>}
        {section === "reports" && report ? (
          <div className="mt-8 grid gap-5 sm:grid-cols-3">
            <div className="card p-5"><div className="text-sm text-[#687485]">Revenue</div><div className="mt-3 text-3xl font-semibold">${Number(report.revenue).toLocaleString()}</div></div>
            <div className="card p-5"><div className="text-sm text-[#687485]">Expenses</div><div className="mt-3 text-3xl font-semibold">${Number(report.expenses).toLocaleString()}</div></div>
            <div className="card p-5"><div className="text-sm text-[#687485]">Profit</div><div className="mt-3 text-3xl font-semibold">${Number(report.profit).toLocaleString()}</div></div>
            <div className="card mt-1 p-5 sm:col-span-3"><h2 className="font-semibold">Customer revenue</h2><div className="mt-4 space-y-3">{report.customer_revenue.length === 0 ? <p className="text-sm text-[#8993a2]">No paid revenue in this period yet.</p> : report.customer_revenue.map((item) => <div key={item.customer} className="flex justify-between border-b border-[#eef1f5] pb-3 text-sm"><span>{item.customer}</span><span className="font-semibold">${Number(item.revenue).toLocaleString()}</span></div>)}</div></div>
          </div>
        ) : (
          <div className="card mt-8 overflow-hidden"><div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm"><thead className="border-b border-[#e7ebf0] bg-[#fbfcfe] text-xs uppercase tracking-wider text-[#8993a2]"><tr><th className="px-5 py-4">Name / description</th><th className="px-5 py-4">Status / method</th><th className="px-5 py-4 text-right">Amount / date</th></tr></thead><tbody className="divide-y divide-[#eef1f5]">{rows.length === 0 ? <tr><td colSpan={3} className="px-5 py-16 text-center"><div className="text-sm font-semibold">No records yet</div><p className="mt-1 text-xs text-[#8993a2]">Use the action above to add your first {title.toLowerCase().replace(/s$/, "")}.</p></td></tr> : rows.map((row) => <tr key={row.id} className="table-row"><td className="px-5 py-4 font-medium">{row.name ?? row.description}<div className="text-xs font-normal text-[#8993a2]">{"email" in row ? row.email ?? "" : "sku" in row ? row.sku ?? "" : ""}</div></td><td className="px-5 py-4 capitalize text-[#687485]">{row.status ?? ("payment_method" in row ? row.payment_method : "—")}</td><td className="px-5 py-4 text-right font-semibold">{("price" in row ? `$${Number(row.price).toLocaleString()}` : "amount" in row ? `$${Number(row.amount).toLocaleString()}` : row.created_at?.slice(0, 10))}</td></tr>)}</tbody></table></div></div>
        )}
      </div>
    </main>
  );
}
