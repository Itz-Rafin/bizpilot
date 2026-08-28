"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, FileText, Plus, Send, Trash2, X } from "lucide-react";
import { createApi, type Customer, type Invoice } from "@/lib/api/client";
import { createClient } from "@/lib/supabase/client";

type Line = { description: string; quantity: number; unit_price: number };
const emptyLine = (): Line => ({ description: "", quantity: 1, unit_price: 0 });

async function getApi() {
  const supabase = createClient();
  const session = supabase ? (await supabase.auth.getSession()).data.session : null;
  return createApi(session?.access_token);
}

function money(value: string | number) {
  return Number(value || 0).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export default function InvoiceSection() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [customerId, setCustomerId] = useState("");
  const [issueDate, setIssueDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState(() => new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10));
  const [taxRate, setTaxRate] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<Line[]>([emptyLine()]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const visible = useMemo(() => invoices.filter((item) => {
    const matchesStatus = !status || item.status === status;
    const value = item.invoice_number.toLowerCase();
    return matchesStatus && value.includes(search.trim().toLowerCase());
  }), [invoices, search, status]);

  const subtotal = lines.reduce((sum, line) => sum + Math.max(0, Number(line.quantity)) * Math.max(0, Number(line.unit_price)), 0);
  const tax = subtotal * (Math.max(0, Number(taxRate)) / 100);
  const total = Math.max(0, subtotal + tax - Math.max(0, Number(discount)));

  async function load() {
    try {
      const api = await getApi();
      const [invoiceData, customerData] = await Promise.all([api.invoices.list(), api.customers.list()]);
      setInvoices(invoiceData);
      setCustomers(customerData.filter((customer) => customer.status === "active"));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load invoices");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function openCreate() {
    setCustomerId(customers[0]?.id ?? "");
    setIssueDate(new Date().toISOString().slice(0, 10));
    setDueDate(new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10));
    setTaxRate(0);
    setDiscount(0);
    setNotes("");
    setLines([emptyLine()]);
    setError(null);
    setOpen(true);
  }

  function changeLine(index: number, key: keyof Line, value: string) {
    setLines((current) => current.map((line, row) => row === index ? { ...line, [key]: key === "description" ? value : Number(value) } : line));
  }

  async function createInvoice(event: React.FormEvent) {
    event.preventDefault();
    if (!customerId || saving || lines.some((line) => !line.description.trim() || line.quantity <= 0 || line.unit_price < 0)) return;
    setSaving(true);
    setError(null);
    try {
      const api = await getApi();
      const created = await api.invoices.create({
        customer_id: customerId,
        issue_date: issueDate,
        due_date: dueDate,
        tax_rate: taxRate,
        discount,
        notes: notes.trim() || undefined,
        items: lines.map((line) => ({ description: line.description.trim(), quantity: line.quantity, unit_price: line.unit_price })),
      });
      setInvoices((current) => [created, ...current]);
      setOpen(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to create invoice");
    } finally {
      setSaving(false);
    }
  }

  async function updateInvoice(id: string, action: "send" | "cancel") {
    try {
      const api = await getApi();
      const updated = action === "send" ? await api.invoices.send(id) : await api.invoices.cancel(id);
      setInvoices((current) => current.map((item) => item.id === updated.id ? updated : item));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to update invoice");
    }
  }

  async function deleteDraft(id: string) {
    if (!window.confirm("Delete this draft invoice?")) return;
    try {
      const api = await getApi();
      await api.invoices.removeDraft(id);
      setInvoices((current) => current.filter((item) => item.id !== id));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to delete draft");
    }
  }

  return (
    <main className="min-h-screen bg-[#f6f8fb] p-5 text-[#17202a] sm:p-8">
      <div className="mx-auto max-w-6xl">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-[#2557d6] hover:underline"><ArrowLeft size={16}/> Back to overview</Link>
        <div className="mt-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div><div className="text-sm font-semibold text-[#2557d6]">Invoices</div><h1 className="mt-1 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">Get paid on time</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-[#687485]">Create clear invoices, send them, and keep payment status in one place.</p></div>
          <button className="btn-primary" onClick={openCreate}><Plus size={17}/> New invoice</button>
        </div>

        {error && <div role="alert" className="mt-6 rounded-xl border border-[#f1cccc] bg-[#fff7f7] px-4 py-3 text-sm text-[#a73f3f]">{error}</div>}
        <div className="card mt-8 flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <input className="field max-w-sm" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search invoice number" />
          <select className="field sm:max-w-40" value={status} onChange={(event) => setStatus(event.target.value)}><option value="">All statuses</option><option value="draft">Draft</option><option value="sent">Sent</option><option value="paid">Paid</option><option value="overdue">Overdue</option><option value="cancelled">Cancelled</option></select>
        </div>
        <div className="card mt-4 overflow-hidden">
          {loading ? <div className="space-y-3 p-5">{[1,2,3,4].map((item) => <div key={item} className="h-14 animate-pulse rounded-xl bg-[#f3f5f8]" />)}</div> : visible.length === 0 ? <div className="px-5 py-16 text-center"><div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[#e9efff] text-[#2557d6]"><FileText size={20}/></div><h2 className="mt-4 font-semibold">No invoices yet</h2><p className="mt-2 text-sm text-[#8993a2]">Create your first invoice and keep your cash flow moving.</p><button className="btn-primary mt-5" onClick={openCreate}>Create invoice</button></div> : <div className="overflow-x-auto"><table className="w-full min-w-[800px] text-left text-sm"><thead className="border-b border-[#e7ebf0] bg-[#fbfcfe] text-xs uppercase tracking-wider text-[#8993a2]"><tr><th className="px-5 py-4">Invoice</th><th className="px-5 py-4">Date</th><th className="px-5 py-4">Status</th><th className="px-5 py-4 text-right">Total</th><th className="px-5 py-4 text-right">Actions</th></tr></thead><tbody className="divide-y divide-[#eef1f5]">{visible.map((item) => <tr key={item.id} className="table-row"><td className="px-5 py-4"><div className="font-semibold">{item.invoice_number}</div><div className="text-xs text-[#8993a2]">Due {item.due_date}</div></td><td className="px-5 py-4 text-[#687485]">{item.issue_date}</td><td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${item.status === "paid" ? "bg-[#edf8f4] text-[#1c8c63]" : item.status === "cancelled" ? "bg-[#f1f3f6] text-[#687485]" : "bg-[#eef2ff] text-[#2557d6]"}`}>{item.status}</span></td><td className="px-5 py-4 text-right font-semibold">{money(item.total)}</td><td className="px-5 py-4"><div className="flex justify-end gap-2">{item.status === "draft" && <><button className="btn-secondary px-3 py-2" onClick={() => updateInvoice(item.id, "send")}><Send size={14}/> Send</button><button className="rounded-lg p-2.5 text-[#a73f3f] hover:bg-[#fff7f7]" onClick={() => deleteDraft(item.id)} aria-label={`Delete ${item.invoice_number}`}><Trash2 size={16}/></button></>}{item.status === "sent" && <button className="btn-secondary px-3 py-2" onClick={() => updateInvoice(item.id, "cancel")}>Cancel</button>}</div></td></tr>)}</tbody></table></div>}
        </div>
      </div>

      {open && <div className="fixed inset-0 z-50 overflow-y-auto bg-[#17202a]/35 p-5 backdrop-blur-sm"><div className="mx-auto my-8 w-full max-w-3xl rounded-2xl border border-[#e7ebf0] bg-white p-6 shadow-2xl sm:p-7"><div className="flex items-start justify-between"><div><div className="text-sm font-semibold text-[#2557d6]">New invoice</div><h2 className="mt-1 text-2xl font-semibold">Create an invoice</h2></div><button className="rounded-lg p-2 text-[#687485] hover:bg-[#f6f8fb]" onClick={() => setOpen(false)} aria-label="Close"><X size={18}/></button></div><form onSubmit={createInvoice} className="mt-6 space-y-6"><div className="grid gap-4 sm:grid-cols-3"><label className="block text-sm font-medium sm:col-span-2">Customer<select className="field mt-2" value={customerId} onChange={(event) => setCustomerId(event.target.value)} required><option value="">Select customer</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}{customer.company ? ` · ${customer.company}` : ""}</option>)}</select></label><div className="rounded-xl bg-[#f6f8fb] p-4"><div className="text-xs uppercase tracking-wider text-[#8993a2]">Total</div><div className="mt-1 text-2xl font-semibold tracking-tight">{money(total)}</div></div></div><div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-medium">Issue date<input className="field mt-2" type="date" value={issueDate} onChange={(event) => setIssueDate(event.target.value)} required/></label><label className="block text-sm font-medium">Due date<input className="field mt-2" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} required/></label></div><div><div className="mb-3 flex items-center justify-between"><h3 className="font-semibold">Line items</h3><button type="button" className="btn-secondary px-3 py-2" onClick={() => setLines((current) => [...current, emptyLine()])}><Plus size={14}/> Add line</button></div><div className="space-y-3">{lines.map((line, index) => <div key={index} className="grid gap-3 rounded-xl border border-[#e7ebf0] p-3 sm:grid-cols-[1fr_110px_140px_40px]"><input className="field" placeholder="Description" value={line.description} onChange={(event) => changeLine(index, "description", event.target.value)} required/><input className="field" type="number" min="0.01" step="0.01" value={line.quantity} onChange={(event) => changeLine(index, "quantity", event.target.value)} required/><input className="field" type="number" min="0" step="0.01" value={line.unit_price} onChange={(event) => changeLine(index, "unit_price", event.target.value)} required/><button type="button" disabled={lines.length === 1} className="rounded-lg p-2.5 text-[#a73f3f] hover:bg-[#fff7f7] disabled:opacity-30" onClick={() => setLines((current) => current.filter((_, row) => row !== index))} aria-label="Remove line"><Trash2 size={15}/></button></div>)}</div></div><div className="grid gap-4 sm:grid-cols-3"><label className="block text-sm font-medium">Tax %<input className="field mt-2" type="number" min="0" max="100" step="0.01" value={taxRate} onChange={(event) => setTaxRate(Number(event.target.value))}/></label><label className="block text-sm font-medium">Discount<input className="field mt-2" type="number" min="0" step="0.01" value={discount} onChange={(event) => setDiscount(Number(event.target.value))}/></label><div className="rounded-xl bg-[#f6f8fb] p-4 text-sm"><div className="flex justify-between"><span>Subtotal</span><span className="font-semibold">{money(subtotal)}</span></div><div className="mt-2 flex justify-between"><span>Tax</span><span className="font-semibold">{money(tax)}</span></div><div className="mt-3 flex justify-between border-t border-[#e7ebf0] pt-3"><span>Total</span><span className="font-semibold">{money(total)}</span></div></div></div><label className="block text-sm font-medium">Notes<textarea className="field mt-2 min-h-24 resize-y" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Payment terms, thank-you note, or other details"/></label><div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button type="button" className="btn-secondary" onClick={() => setOpen(false)}>Cancel</button><button type="submit" className="btn-primary" disabled={saving}>{saving ? "Creating…" : "Create invoice"}</button></div></form></div></div>}
    </main>
  );
}
