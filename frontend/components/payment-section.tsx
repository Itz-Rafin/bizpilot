"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, CircleDollarSign, Plus, X } from "lucide-react";
import { createApi, type Invoice, type Payment } from "@/lib/api/client";
import { createClient } from "@/lib/supabase/client";

async function getApi() {
  const supabase = createClient();
  const session = supabase ? (await supabase.auth.getSession()).data.session : null;
  return createApi(session?.access_token);
}

function money(value: string | number) {
  return Number(value || 0).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export default function PaymentSection() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [open, setOpen] = useState(false);
  const [invoiceId, setInvoiceId] = useState("");
  const [amount, setAmount] = useState(0);
  const [method, setMethod] = useState("bank_transfer");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const api = await getApi();
      const [paymentData, invoiceData] = await Promise.all([api.payments.list(), api.invoices.list()]);
      setPayments(paymentData);
      setInvoices(invoiceData.filter((invoice) => invoice.status !== "cancelled"));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load payments");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function openCreate() {
    setInvoiceId(invoices.find((invoice) => invoice.status === "sent")?.id ?? invoices[0]?.id ?? "");
    setAmount(0);
    setMethod("bank_transfer");
    setDate(new Date().toISOString().slice(0, 10));
    setReference("");
    setNotes("");
    setError(null);
    setOpen(true);
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!invoiceId || amount <= 0 || saving) return;
    setSaving(true);
    setError(null);
    try {
      const api = await getApi();
      const created = await api.payments.create({ invoice_id: invoiceId, amount, payment_method: method, payment_date: date, reference: reference.trim() || undefined, notes: notes.trim() || undefined });
      setPayments((current) => [created, ...current]);
      setOpen(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to record payment");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f6f8fb] p-5 text-[#17202a] sm:p-8">
      <div className="mx-auto max-w-6xl">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-[#2557d6] hover:underline"><ArrowLeft size={16}/> Back to overview</Link>
        <div className="mt-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><div className="text-sm font-semibold text-[#2557d6]">Payments</div><h1 className="mt-1 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">Money received</h1><p className="mt-2 text-sm leading-6 text-[#687485]">Record payments and keep invoices moving toward paid.</p></div><button className="btn-primary" onClick={openCreate}><Plus size={17}/> Record payment</button></div>
        {error && <div role="alert" className="mt-6 rounded-xl border border-[#f1cccc] bg-[#fff7f7] px-4 py-3 text-sm text-[#a73f3f]">{error}</div>}
        <div className="card mt-8 overflow-hidden">{loading ? <div className="space-y-3 p-5">{[1,2,3].map((item) => <div key={item} className="h-14 animate-pulse rounded-xl bg-[#f3f5f8]" />)}</div> : payments.length === 0 ? <div className="px-5 py-16 text-center"><div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[#edf8f4] text-[#1c8c63]"><CircleDollarSign size={20}/></div><h2 className="mt-4 font-semibold">No payments recorded</h2><p className="mt-2 text-sm text-[#8993a2]">Record your first payment to keep your cash flow up to date.</p><button className="btn-primary mt-5" onClick={openCreate}>Record payment</button></div> : <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="border-b border-[#e7ebf0] bg-[#fbfcfe] text-xs uppercase tracking-wider text-[#8993a2]"><tr><th className="px-5 py-4">Payment</th><th className="px-5 py-4">Date</th><th className="px-5 py-4">Method</th><th className="px-5 py-4 text-right">Amount</th></tr></thead><tbody className="divide-y divide-[#eef1f5]">{payments.map((payment) => <tr key={payment.id} className="table-row"><td className="px-5 py-4"><div className="font-semibold">{payment.reference || "Payment"}</div><div className="text-xs text-[#8993a2]">Invoice {payment.invoice_id.slice(0, 8)}</div></td><td className="px-5 py-4 text-[#687485]">{payment.payment_date}</td><td className="px-5 py-4 capitalize text-[#687485]">{payment.payment_method.replaceAll("_", " ")}</td><td className="px-5 py-4 text-right font-semibold">{money(payment.amount)}</td></tr>)}</tbody></table></div>}</div>
      </div>
      {open && <div className="fixed inset-0 z-50 grid place-items-center bg-[#17202a]/35 p-5 backdrop-blur-sm"><div className="w-full max-w-lg rounded-2xl border border-[#e7ebf0] bg-white p-6 shadow-2xl sm:p-7"><div className="flex items-start justify-between"><div><div className="text-sm font-semibold text-[#2557d6]">New payment</div><h2 className="mt-1 text-2xl font-semibold">Record a payment</h2></div><button className="rounded-lg p-2 text-[#687485] hover:bg-[#f6f8fb]" onClick={() => setOpen(false)} aria-label="Close"><X size={18}/></button></div><form onSubmit={save} className="mt-6 space-y-4"><label className="block text-sm font-medium">Invoice<select className="field mt-2" value={invoiceId} onChange={(event) => setInvoiceId(event.target.value)} required><option value="">Select invoice</option>{invoices.map((invoice) => <option key={invoice.id} value={invoice.id}>{invoice.invoice_number} · {money(invoice.total)} · {invoice.status}</option>)}</select></label><div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-medium">Amount<input className="field mt-2" type="number" min="0.01" step="0.01" value={amount} onChange={(event) => setAmount(Number(event.target.value))} required/></label><label className="block text-sm font-medium">Payment date<input className="field mt-2" type="date" value={date} onChange={(event) => setDate(event.target.value)} required/></label></div><label className="block text-sm font-medium">Method<select className="field mt-2" value={method} onChange={(event) => setMethod(event.target.value)}><option value="bank_transfer">Bank transfer</option><option value="cash">Cash</option><option value="card">Card</option><option value="mobile_payment">Mobile payment</option><option value="other">Other</option></select></label><label className="block text-sm font-medium">Reference<input className="field mt-2" value={reference} onChange={(event) => setReference(event.target.value)} placeholder="Transaction or receipt number"/></label><label className="block text-sm font-medium">Notes<textarea className="field mt-2 min-h-20" value={notes} onChange={(event) => setNotes(event.target.value)}/></label><div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button type="button" className="btn-secondary" onClick={() => setOpen(false)}>Cancel</button><button type="submit" className="btn-primary" disabled={saving}>{saving ? "Saving…" : "Record payment"}</button></div></form></div></div>}
    </main>
  );
}
