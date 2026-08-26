export type Customer = {
  id: string; organization_id: string; name: string; email: string | null; phone: string | null;
  company: string | null; address: string | null; notes: string | null; status: string;
  created_at: string; updated_at: string;
};

export type Invoice = {
  id: string; organization_id: string; customer_id: string; invoice_number: string;
  issue_date: string; due_date: string; status: string; subtotal: string; tax: string;
  discount: string; total: string; notes: string | null;
};

export type DashboardMetrics = { revenue: string; expenses: string; profit: string; customer_count: number; outstanding: string; period_start: string; period_end: string };
type ApiError = { detail?: string };
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

export function createApi(accessToken?: string) {
  async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(`${API_URL}${path}`, { ...init, headers: { "Content-Type": "application/json", ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}), ...(init?.headers ?? {}) }, cache: "no-store" });
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as ApiError;
      throw new Error(body.detail ?? "Something went wrong. Please try again.");
    }
    if (response.status === 204) return undefined as T;
    return response.json() as Promise<T>;
  }
  return {
    customers: {
      list: (search = "") => request<Customer[]>(`/customers${search ? `?search=${encodeURIComponent(search)}` : ""}`),
      create: (payload: { name: string; email?: string; phone?: string; company?: string; address?: string; notes?: string }) => request<Customer>("/customers", { method: "POST", body: JSON.stringify(payload) }),
    },
    invoices: { list: () => request<Invoice[]>("/invoices") },
    dashboard: { metrics: (start?: string, end?: string) => request<DashboardMetrics>(`/dashboard/metrics${start && end ? `?start=${start}&end=${end}` : ""}`) },
  };
}
