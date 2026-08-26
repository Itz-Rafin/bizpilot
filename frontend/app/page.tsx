"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, Bell, ChevronDown, CircleDollarSign, FileText, LayoutDashboard, Menu, Plus, Receipt, Search, Settings, Users, X, type LucideIcon } from "lucide-react";
import { createApi, type Customer, type DashboardMetrics, type Invoice } from "@/lib/api/client";
import { createClient } from "@/lib/supabase/client";

const navigation = [
  ["Overview", LayoutDashboard], ["Customers", Users], ["Invoices", FileText], ["Payments", CircleDollarSign], ["Expenses", Receipt], ["Reports", ArrowUpRight], ["Settings", Settings],
] as const;

function money(value: string | number | undefined) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Number(value ?? 0));
}

export default function Home() {
  const [active, setActive] = useState("Overview");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [query, setQuery] = useState("");
  const [showCustomer, setShowCustomer] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");

  const filteredCustomers = useMemo(() => customers.filter((item) => item.name.toLowerCase().includes(query.toLowerCase()) || (item.company ?? "").toLowerCase().includes(query.toLowerCase())), [customers, query]);
  const metricCards: Array<{ label: string; value: string; note: string; icon: LucideIcon; color: string }> = [
    { label: "Revenue", value: metrics ? money(metrics.revenue) : "—", note: "Payments received in period", icon: CircleDollarSign, color: "#2557d6" },
    { label: "Expenses", value: metrics ? money(metrics.expenses) : "—", note: "Recorded business costs", icon: Receipt, color: "#b97812" },
    { label: "Net profit", value: metrics ? money(metrics.profit) : "—", note: "Revenue less expenses", icon: ArrowUpRight, color: "#1c8c63" },
    { label: "Customers", value: metrics ? String(metrics.customer_count) : "—", note: "Active relationships", icon: Users, color: "#7c55c9" },
  ];

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const supabase = createClient();
        const session = supabase ? (await supabase.auth.getSession()).data.session : null;
        const api = createApi(session?.access_token);
        const [metricData, invoiceData, customerData] = await Promise.all([api.dashboard.metrics(), api.invoices.list(), api.customers.list()]);
        if (!ignore) { setMetrics(metricData); setInvoices(invoiceData); setCustomers(customerData); }
      } catch (cause) {
        if (!ignore) setError(cause instanceof Error ? cause.message : "Unable to load workspace data");
      } finally { if (!ignore) setLoading(false); }
    }
    load();
    return () => { ignore = true; };
  }, []);

  async function addCustomer(event: React.FormEvent) {
    event.preventDefault();
    if (!customerName.trim()) return;
    try {
      const supabase = createClient();
      const session = supabase ? (await supabase.auth.getSession()).data.session : null;
      const customer = await createApi(session?.access_token).customers.create({ name: customerName.trim(), email: customerEmail || undefined });
      setCustomers((current) => [customer, ...current]); setCustomerName(""); setCustomerEmail(""); setShowCustomer(false); setError(null);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to create customer"); }
  }

  return <div className="min-h-screen bg-[#f6f8fb] text-[#17202a]">
    <aside className={`fixed inset-y-0 left-0 z-30 w-64 border-r border-[#e7ebf0] bg-white px-5 py-6 transition-transform lg:translate-x-0 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
      <div className="flex items-center justify-between px-2"><div><div className="text-xl font-bold tracking-tight">Biz<span className="text-[#2557d6]">Pilot</span></div><div className="mt-1 text-[11px] font-medium uppercase tracking-[0.18em] text-[#8993a2]">Business workspace</div></div><button className="lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Close navigation"><X size={20}/></button></div>
      <div className="mt-10 rounded-xl bg-[#f4f6fb] p-3"><div className="text-xs font-semibold uppercase tracking-wider text-[#8993a2]">Workspace</div><div className="mt-2 flex items-center gap-2"><div className="grid h-8 w-8 place-items-center rounded-lg bg-[#2557d6] text-xs font-bold text-white">AC</div><div><div className="text-sm font-semibold">Acme Creative</div><div className="text-xs text-[#8993a2]">Owner workspace</div></div><ChevronDown className="ml-auto text-[#8993a2]" size={15}/></div></div>
      <nav className="mt-8 space-y-1" aria-label="Primary navigation">{navigation.map(([label, Icon]) => <Link key={label} href={label === "Overview" ? "/" : `/${label.toLowerCase()}`} onClick={() => { setActive(label); setMobileOpen(false); }} className={`focus-ring flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${active === label ? "bg-[#e9efff] text-[#2557d6]" : "text-[#687485] hover:bg-[#f6f8fb] hover:text-[#17202a]"}`}><Icon size={18} strokeWidth={1.8}/>{label}</Link>)}</nav>
      <div className="absolute bottom-6 left-5 right-5 rounded-xl border border-[#e7ebf0] p-3"><div className="flex items-center gap-3"><div className="grid h-9 w-9 place-items-center rounded-full bg-[#dce4f7] text-xs font-bold text-[#2557d6]">RA</div><div className="min-w-0"><div className="truncate text-sm font-semibold">Rafin Ahmed</div><div className="truncate text-xs text-[#8993a2]">Owner</div></div><Settings className="ml-auto text-[#8993a2]" size={16}/></div></div>
    </aside>
    {mobileOpen && <button aria-label="Close navigation overlay" className="fixed inset-0 z-20 bg-black/20 lg:hidden" onClick={() => setMobileOpen(false)}/>} 
    <main className="lg:pl-64"><header className="flex h-20 items-center justify-between border-b border-[#e7ebf0] bg-white px-5 sm:px-8"><div className="flex items-center gap-3"><button className="lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu size={21}/></button><div><div className="text-sm text-[#8993a2]">Tuesday, August 26, 2026</div><h1 className="text-xl font-semibold tracking-tight">Good morning, Rafin</h1></div></div><div className="flex items-center gap-2"><button className="focus-ring rounded-lg p-2.5 text-[#687485] hover:bg-[#f6f8fb]" aria-label="Notifications"><Bell size={19}/><span className="absolute ml-3 mt-[-22px] h-2 w-2 rounded-full bg-[#c94d4d]"/></button><div className="ml-2 hidden h-8 w-px bg-[#e7ebf0] sm:block"/><button className="focus-ring flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-[#f6f8fb]"><div className="grid h-8 w-8 place-items-center rounded-full bg-[#dce4f7] text-xs font-bold text-[#2557d6]">RA</div><ChevronDown size={15} className="text-[#8993a2]"/></button></div></header>
      <div className="mx-auto max-w-[1440px] p-5 sm:p-8"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><div className="text-sm font-semibold text-[#2557d6]">{active}</div><h2 className="mt-1 text-3xl font-semibold tracking-[-0.04em]">Your business at a glance</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[#687485]">Keep your day moving with a clear view of revenue, customers, invoices, and the work that needs your attention.</p></div><button onClick={() => setShowCustomer(true)} className="focus-ring inline-flex items-center justify-center gap-2 rounded-lg bg-[#2557d6] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1d48b6] active:scale-[.98]"><Plus size={17}/> New customer</button></div>
        {error && <div role="alert" className="mt-6 rounded-xl border border-[#f1cccc] bg-[#fff7f7] px-4 py-3 text-sm text-[#a73f3f]">{error}. Connect Supabase and sign in to load workspace data.</div>}
        <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{metricCards.map(({ label, value, note, icon: Icon, color }) => <div key={String(label)} className="card p-5"><div className="flex items-start justify-between"><div><div className="text-sm font-medium text-[#687485]">{label}</div><div className="metric-value mt-3 text-3xl font-semibold">{loading ? <span className="inline-block h-8 w-20 animate-pulse rounded bg-[#edf0f5]"/> : value}</div><div className="mt-2 text-xs text-[#8993a2]">{note}</div></div><div className="rounded-xl p-2.5" style={{ backgroundColor: `${color}15`, color: String(color) }}><Icon size={19}/></div></div></div>)}</section>
        <section className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_1fr]"><div className="card p-5"><div className="flex items-start justify-between"><div><h3 className="font-semibold">Revenue overview</h3><p className="mt-1 text-sm text-[#8993a2]">A real-time view of your selected period</p></div><select className="focus-ring rounded-lg border border-[#e7ebf0] bg-white px-3 py-2 text-xs font-medium text-[#687485]"><option>This month</option><option>Last month</option><option>This year</option></select></div><div className="mt-8 grid h-48 place-items-center rounded-xl bg-[#f6f8fb] px-6 text-center text-sm text-[#8993a2]">{metrics ? "Revenue trend details will appear as payments are recorded." : "Connect your workspace to see revenue trend data."}</div></div><div className="card p-5"><div className="flex items-start justify-between"><div><h3 className="font-semibold">Outstanding invoices</h3><p className="mt-1 text-sm text-[#8993a2]">Invoices that need attention</p></div><button className="text-xs font-semibold text-[#2557d6]">View all</button></div><div className="mt-5 space-y-3">{invoices.length === 0 ? <div className="rounded-xl bg-[#f6f8fb] px-4 py-8 text-center text-sm text-[#8993a2]">No invoices yet. Create your first invoice to see it here.</div> : invoices.slice(0, 4).map((invoice) => <div key={invoice.id} className="flex items-center justify-between rounded-xl border border-[#eef1f5] px-3 py-3"><div><div className="text-sm font-semibold">{invoice.invoice_number}</div><div className="mt-1 text-xs text-[#8993a2]">Due {invoice.due_date}</div></div><div className="text-right"><div className="text-sm font-semibold">{money(invoice.total)}</div><div className="mt-1 text-[11px] font-medium capitalize text-[#b97812]">{invoice.status}</div></div></div>)}</div></div></section>
        <section className="card mt-6 p-5"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><h3 className="font-semibold">Customers</h3><p className="mt-1 text-sm text-[#8993a2]">Manage relationships and keep your pipeline healthy.</p></div><div className="relative"><Search className="absolute left-3 top-2.5 text-[#a1aab7]" size={16}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search customers" className="focus-ring w-full rounded-lg border border-[#e7ebf0] py-2 pl-9 pr-3 text-sm outline-none sm:w-64"/></div></div><div className="mt-5 overflow-x-auto"><table className="w-full min-w-[600px] text-left text-sm"><thead className="border-b border-[#e7ebf0] text-xs uppercase tracking-wider text-[#8993a2]"><tr><th className="pb-3 font-semibold">Customer</th><th className="pb-3 font-semibold">Company</th><th className="pb-3 font-semibold">Status</th><th className="pb-3 text-right font-semibold">Added</th></tr></thead><tbody className="divide-y divide-[#eef1f5]">{filteredCustomers.length === 0 ? <tr><td colSpan={4} className="py-10 text-center text-[#8993a2]">No customers found. Add a customer to start building your workspace.</td></tr> : filteredCustomers.slice(0, 6).map((customer) => <tr key={customer.id}><td className="py-4"><div className="flex items-center gap-3"><div className="grid h-8 w-8 place-items-center rounded-full bg-[#e9efff] text-xs font-bold text-[#2557d6]">{customer.name.slice(0,2).toUpperCase()}</div><div className="font-medium">{customer.name}<div className="text-xs text-[#8993a2]">{customer.email ?? "No email"}</div></div></div></td><td className="py-4 text-[#687485]">{customer.company ?? "—"}</td><td className="py-4"><span className="rounded-full bg-[#e7f6ef] px-2.5 py-1 text-xs font-semibold capitalize text-[#1c8c63]">{customer.status}</span></td><td className="py-4 text-right text-[#687485]">{new Date(customer.created_at).toLocaleDateString()}</td></tr>)}</tbody></table></div></section>
      </div>
    </main>
    {showCustomer && <div className="fixed inset-0 z-40 grid place-items-center bg-[#17202a]/30 p-5"><div role="dialog" aria-modal="true" aria-labelledby="customer-title" className="card w-full max-w-md p-6"><div className="flex items-center justify-between"><div><h2 id="customer-title" className="text-lg font-semibold">New customer</h2><p className="mt-1 text-sm text-[#8993a2]">Add a relationship to your workspace.</p></div><button onClick={() => setShowCustomer(false)} aria-label="Close dialog" className="rounded-lg p-2 text-[#8993a2] hover:bg-[#f6f8fb]"><X size={18}/></button></div><form onSubmit={addCustomer} className="mt-6 space-y-4"><label className="block text-sm font-medium">Name<input required value={customerName} onChange={(event) => setCustomerName(event.target.value)} className="focus-ring mt-2 w-full rounded-lg border border-[#e7ebf0] px-3 py-2.5 text-sm outline-none" placeholder="e.g. Jordan Lee"/></label><label className="block text-sm font-medium">Email<span className="font-normal text-[#8993a2]"> (optional)</span><input type="email" value={customerEmail} onChange={(event) => setCustomerEmail(event.target.value)} className="focus-ring mt-2 w-full rounded-lg border border-[#e7ebf0] px-3 py-2.5 text-sm outline-none" placeholder="jordan@company.com"/></label><div className="flex justify-end gap-2 pt-2"><button type="button" onClick={() => setShowCustomer(false)} className="rounded-lg px-4 py-2.5 text-sm font-semibold text-[#687485] hover:bg-[#f6f8fb]">Cancel</button><button type="submit" className="rounded-lg bg-[#2557d6] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1d48b6]">Add customer</button></div></form></div></div>}
  </div>;
}
