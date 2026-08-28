"use client";

import { useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { createApi, type Customer } from "@/lib/api/client";
import { createClient } from "@/lib/supabase/client";

type FormState = {
  name: string;
  email: string;
  phone: string;
  company: string;
  address: string;
  notes: string;
};

const emptyForm: FormState = {
  name: "",
  email: "",
  phone: "",
  company: "",
  address: "",
  notes: "",
};

export default function CustomerSection() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return customers;
    return customers.filter((customer) =>
      [customer.name, customer.email, customer.company, customer.phone]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term)),
    );
  }, [customers, query]);

  async function apiClient() {
    const supabase = createClient();
    const session = supabase
      ? (await supabase.auth.getSession()).data.session
      : null;
    return createApi(session?.access_token);
  }

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const api = await apiClient();
        const data = await api.customers.list();
        if (!ignore) setCustomers(data);
      } catch (cause) {
        if (!ignore) setError(cause instanceof Error ? cause.message : "Unable to load customers");
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, []);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setError(null);
    setOpen(true);
  }

  function openEdit(customer: Customer) {
    setEditing(customer);
    setForm({
      name: customer.name,
      email: customer.email ?? "",
      phone: customer.phone ?? "",
      company: customer.company ?? "",
      address: customer.address ?? "",
      notes: customer.notes ?? "",
    });
    setError(null);
    setOpen(true);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.name.trim() || saving) return;
    setSaving(true);
    setError(null);
    try {
      const api = await apiClient();
      const payload = {
        name: form.name.trim(),
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        company: form.company.trim() || undefined,
        address: form.address.trim() || undefined,
        notes: form.notes.trim() || undefined,
      };

      if (editing) {
        const updated = await api.customers.update(editing.id, payload);
        setCustomers((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      } else {
        const created = await api.customers.create(payload);
        setCustomers((current) => [created, ...current]);
      }
      setOpen(false);
      setForm(emptyForm);
      setEditing(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save customer");
    } finally {
      setSaving(false);
    }
  }

  async function archive(customer: Customer) {
    if (!window.confirm(`Archive ${customer.name}?`)) return;
    try {
      const api = await apiClient();
      await api.customers.archive(customer.id);
      setCustomers((current) => current.map((item) => (item.id === customer.id ? { ...item, status: "archived" } : item)));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to archive customer");
    }
  }

  return (
    <main className="min-h-screen bg-[#f6f8fb] p-5 text-[#17202a] sm:p-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <div className="text-sm font-semibold text-[#2557d6]">Customers</div>
            <h1 className="mt-1 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">Customer relationships</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#687485]">
              Keep customer details organized and ready for your next invoice.
            </p>
          </div>
          <button className="btn-primary" onClick={openCreate}>
            <Plus size={17} /> Add customer
          </button>
        </div>

        {error && (
          <div role="alert" className="mt-6 flex items-start justify-between gap-4 rounded-xl border border-[#f1cccc] bg-[#fff7f7] px-4 py-3 text-sm text-[#a73f3f]">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="font-semibold">Dismiss</button>
          </div>
        )}

        <div className="card mt-8 p-4 sm:p-5">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8993a2]" size={16} />
            <input
              className="field pl-9"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by name, company, or email"
              aria-label="Search customers"
            />
          </div>
        </div>

        <div className="card mt-4 overflow-hidden">
          {loading ? (
            <div className="space-y-3 p-5">
              {[1, 2, 3, 4].map((item) => (
                <div key={item} className="h-14 animate-pulse rounded-xl bg-[#f3f5f8]" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-5 py-16 text-center">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[#e9efff] text-[#2557d6]">
                <Plus size={20} />
              </div>
              <h2 className="mt-4 font-semibold">{query ? "No customers found" : "Add your first customer"}</h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-[#8993a2]">
                {query ? "Try a different search term." : "Once you add a customer, they can be used when creating invoices."}
              </p>
              {!query && <button className="btn-primary mt-5" onClick={openCreate}>Add customer</button>}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="border-b border-[#e7ebf0] bg-[#fbfcfe] text-xs uppercase tracking-wider text-[#8993a2]">
                  <tr>
                    <th className="px-5 py-4">Customer</th>
                    <th className="px-5 py-4">Contact</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#eef1f5]">
                  {filtered.map((customer) => (
                    <tr key={customer.id} className="table-row">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#eef2ff] text-xs font-bold text-[#2557d6]">
                            {customer.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="truncate font-semibold">{customer.name}</div>
                            <div className="truncate text-xs text-[#8993a2]">{customer.company || "No company"}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-[#687485]">
                        <div>{customer.email || "No email"}</div>
                        <div className="text-xs text-[#8993a2]">{customer.phone || "No phone"}</div>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${customer.status === "active" ? "bg-[#edf8f4] text-[#1c8c63]" : "bg-[#f1f3f6] text-[#687485]"}`}>
                          {customer.status}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <button className="btn-secondary px-3 py-2" onClick={() => openEdit(customer)} aria-label={`Edit ${customer.name}`}>
                            <Pencil size={14} /> Edit
                          </button>
                          {customer.status === "active" && (
                            <button className="rounded-lg p-2.5 text-[#a73f3f] hover:bg-[#fff7f7]" onClick={() => archive(customer)} aria-label={`Archive ${customer.name}`}>
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#17202a]/35 p-5 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-[#e7ebf0] bg-white p-6 shadow-2xl sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-[#2557d6]">{editing ? "Edit customer" : "New customer"}</div>
                <h2 className="mt-1 text-2xl font-semibold tracking-tight">{editing ? "Update details" : "Add a customer"}</h2>
              </div>
              <button className="rounded-lg p-2 text-[#687485] hover:bg-[#f6f8fb]" onClick={() => setOpen(false)} aria-label="Close customer form">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={submit} className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium sm:col-span-2">Name<input className="field mt-2" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></label>
              <label className="block text-sm font-medium">Email<input className="field mt-2" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} type="email" /></label>
              <label className="block text-sm font-medium">Phone<input className="field mt-2" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></label>
              <label className="block text-sm font-medium sm:col-span-2">Company<input className="field mt-2" value={form.company} onChange={(event) => setForm({ ...form, company: event.target.value })} /></label>
              <label className="block text-sm font-medium sm:col-span-2">Address<textarea className="field mt-2 min-h-20 resize-y" value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} /></label>
              <label className="block text-sm font-medium sm:col-span-2">Notes<textarea className="field mt-2 min-h-20 resize-y" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></label>
              <div className="flex flex-col-reverse gap-3 pt-2 sm:col-span-2 sm:flex-row sm:justify-end">
                <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>Cancel</button>
                <button className="btn-primary" disabled={saving} type="submit">{saving ? "Saving…" : editing ? "Save changes" : "Add customer"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
