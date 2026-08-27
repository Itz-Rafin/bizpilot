export type Customer = { id: string; organization_id: string; name: string; email: string | null; phone: string | null; company: string | null; address: string | null; notes: string | null; status: string; created_at: string; updated_at: string };
export type Invoice = { id: string; organization_id: string; customer_id: string; invoice_number: string; issue_date: string; due_date: string; status: string; subtotal: string; tax: string; discount: string; total: string; notes: string | null };
export type Product = { id: string; organization_id: string; name: string; sku: string | null; description: string | null; price: string; cost: string; quantity: string; low_stock_threshold: string; status: string; created_at: string; updated_at: string };
export type Service = { id: string; organization_id: string; name: string; description: string | null; price: string; duration_minutes: number | null; status: string; created_at: string; updated_at: string };
export type Expense = { id: string; organization_id: string; category_id: string | null; description: string; amount: string; expense_date: string; payment_method: string; notes: string | null; created_at: string; updated_at: string };
export type DashboardMetrics = { revenue: string; expenses: string; profit: string; customer_count: number; outstanding: string; period_start: string; period_end: string };
export type ReportSummary = { period_start: string; period_end: string; revenue: string; expenses: string; profit: string; invoice_status: Array<{ status: string; count: number }>; customer_revenue: Array<{ customer: string; revenue: string }> };
export type Notification = { id: string; organization_id: string; user_id: string | null; type: string; title: string; message: string; read: boolean; created_at: string };
type ApiError = { detail?: string };
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

export function createApi(accessToken?: string) {
  async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(`${API_URL}${path}`, { ...init, headers: { "Content-Type": "application/json", ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}), ...(init?.headers ?? {}) }, cache: "no-store" });
    if (!response.ok) { const body = (await response.json().catch(() => ({}))) as ApiError; throw new Error(body.detail ?? "Something went wrong. Please try again."); }
    if (response.status === 204) return undefined as T;
    return response.json() as Promise<T>;
  }
  return {
    auth: { bootstrap: (payload: { business_name: string; business_type: string; currency: string; timezone: string }) => request<{ organization_id: string; created: boolean }>("/auth/bootstrap", { method: "POST", body: JSON.stringify(payload) }) },
    workspace: { me: () => request<{ organization: { id: string; name: string; currency: string; timezone: string } | null; profile: { full_name: string | null } | null; role: string | null; active_organization_id: string | null; organizations: Array<{ id: string; name: string; role: string }> }>("/me"), setActive: (organization_id: string) => request<{ active_organization_id: string }>("/organizations/active", { method: "POST", body: JSON.stringify({ organization_id }) }) },
    customers: { list: (search = "") => request<Customer[]>(`/customers${search ? `?search=${encodeURIComponent(search)}` : ""}`), create: (payload: { name: string; email?: string; phone?: string; company?: string; address?: string; notes?: string }) => request<Customer>("/customers", { method: "POST", body: JSON.stringify(payload) }) },
    invoices: { list: () => request<Invoice[]>("/invoices") },
    products: { list: (search = "") => request<Product[]>(`/products${search ? `?search=${encodeURIComponent(search)}` : ""}`) },
    services: { list: (search = "") => request<Service[]>(`/services${search ? `?search=${encodeURIComponent(search)}` : ""}`) },
    expenses: { list: () => request<Expense[]>("/expenses") },
    reports: { summary: (start?: string, end?: string) => request<ReportSummary>(`/reports/summary${start && end ? `?start=${start}&end=${end}` : ""}`) },
    dashboard: { metrics: (start?: string, end?: string) => request<DashboardMetrics>(`/dashboard/metrics${start && end ? `?start=${start}&end=${end}` : ""}`) },
    notifications: { list: () => request<Notification[]>("/notifications"), markRead: (notificationId: string) => request<Notification>(`/notifications/${notificationId}/read`, { method: "POST" }) },
  };
}
