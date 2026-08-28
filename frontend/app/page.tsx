"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  Bell,
  ChevronDown,
  CircleDollarSign,
  FileText,
  LayoutDashboard,
  Menu,
  Plus,
  Receipt,
  Search,
  Settings,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  createApi,
  type Customer,
  type DashboardMetrics,
  type Invoice,
  type Notification,
} from "@/lib/api/client";
import { createClient } from "@/lib/supabase/client";

const navigation = [
  ["Overview", LayoutDashboard],
  ["Customers", Users],
  ["Invoices", FileText],
  ["Payments", CircleDollarSign],
  ["Expenses", Receipt],
  ["Reports", ArrowUpRight],
  ["Settings", Settings],
] as const;

function money(value: string | number | undefined, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0));
}

export default function Home() {
  const router = useRouter();
  const [active, setActive] = useState("Overview");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [workspace, setWorkspace] = useState<{
    organization: { id: string; name: string; currency: string } | null;
    profile: { full_name: string | null } | null;
    role: string | null;
    active_organization_id: string | null;
    organizations: Array<{ id: string; name: string; role: string }>;
  } | null>(null);
  const [activeOrganizationId, setActiveOrganizationId] = useState<string | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [showCustomer, setShowCustomer] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingCustomer, setSavingCustomer] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");

  const filteredCustomers = useMemo(
    () =>
      customers.filter(
        (item) =>
          item.name.toLowerCase().includes(query.toLowerCase()) ||
          (item.company ?? "").toLowerCase().includes(query.toLowerCase()),
      ),
    [customers, query],
  );

  const currency = workspace?.organization?.currency ?? "USD";
  const metricCards: Array<{
    label: string;
    value: string;
    note: string;
    icon: LucideIcon;
    color: string;
  }> = [
    {
      label: "Revenue",
      value: metrics ? money(metrics.revenue, currency) : "—",
      note: "Payments received",
      icon: CircleDollarSign,
      color: "#2557d6",
    },
    {
      label: "Expenses",
      value: metrics ? money(metrics.expenses, currency) : "—",
      note: "Recorded business costs",
      icon: Receipt,
      color: "#b97812",
    },
    {
      label: "Net profit",
      value: metrics ? money(metrics.profit, currency) : "—",
      note: "Revenue less expenses",
      icon: ArrowUpRight,
      color: "#1c8c63",
    },
    {
      label: "Customers",
      value: metrics ? String(metrics.customer_count) : "—",
      note: "Active relationships",
      icon: Users,
      color: "#7c55c9",
    },
  ];

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const supabase = createClient();
        const session = supabase
          ? (await supabase.auth.getSession()).data.session
          : null;
        const api = createApi(session?.access_token);
        const contextData = await api.workspace.me();
        const [metricData, invoiceData, customerData, notificationData] = await Promise.all([
          api.dashboard.metrics(),
          api.invoices.list(),
          api.customers.list(),
          api.notifications.list(),
        ]);
        if (!ignore) {
          setWorkspace(contextData);
          setActiveOrganizationId(contextData.active_organization_id);
          setMetrics(metricData);
          setInvoices(invoiceData);
          setCustomers(customerData);
          setNotifications(notificationData);
        }
      } catch (cause) {
        if (!ignore) {
          setError(cause instanceof Error ? cause.message : "Unable to load workspace data");
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, []);

  async function switchOrganization(organizationId: string) {
    try {
      const supabase = createClient();
      const session = supabase
        ? (await supabase.auth.getSession()).data.session
        : null;
      await createApi(session?.access_token).workspace.setActive(organizationId);
      setActiveOrganizationId(organizationId);
      window.location.reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to change workspace");
    }
  }

  async function logout() {
    const supabase = createClient();
    await supabase?.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  async function markNotificationRead(notificationId: string) {
    try {
      const supabase = createClient();
      const session = supabase
        ? (await supabase.auth.getSession()).data.session
        : null;
      const updated = await createApi(session?.access_token).notifications.markRead(notificationId);
      setNotifications((current) =>
        current.map((notification) =>
          notification.id === updated.id ? updated : notification,
        ),
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to update notification");
    }
  }

  async function addCustomer(event: React.FormEvent) {
    event.preventDefault();
    if (!customerName.trim() || savingCustomer) return;
    setSavingCustomer(true);
    try {
      const supabase = createClient();
      const session = supabase
        ? (await supabase.auth.getSession()).data.session
        : null;
      const customer = await createApi(session?.access_token).customers.create({
        name: customerName.trim(),
        email: customerEmail.trim() || undefined,
      });
      setCustomers((current) => [customer, ...current]);
      setCustomerName("");
      setCustomerEmail("");
      setShowCustomer(false);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to create customer");
    } finally {
      setSavingCustomer(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f6f8fb] text-[#17202a]">
      <aside
        className={`fixed inset-y-0 left-0 z-30 w-64 border-r border-[#e7ebf0] bg-white px-5 py-6 transition-transform lg:translate-x-0 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex items-center justify-between px-2">
          <div>
            <div className="text-xl font-bold tracking-tight">
              Biz<span className="text-[#2557d6]">Pilot</span>
            </div>
            <div className="mt-1 text-[11px] font-medium uppercase tracking-[0.18em] text-[#8993a2]">
              Business workspace
            </div>
          </div>
          <button className="lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Close navigation">
            <X size={20} />
          </button>
        </div>

        <div className="mt-10 rounded-xl bg-[#f4f6fb] p-3">
          <label
            className="text-xs font-semibold uppercase tracking-wider text-[#8993a2]"
            htmlFor="organization-switcher"
          >
            Workspace
          </label>
          <select
            id="organization-switcher"
            value={activeOrganizationId ?? ""}
            onChange={(event) => switchOrganization(event.target.value)}
            className="focus-ring mt-2 w-full rounded-lg border-0 bg-transparent px-0 text-sm font-semibold outline-none"
          >
            <option value="" disabled>
              Select organization
            </option>
            {workspace?.organizations.map((organization) => (
              <option key={organization.id} value={organization.id}>
                {organization.name} · {organization.role}
              </option>
            ))}
          </select>
        </div>

        <nav className="mt-8 space-y-1" aria-label="Primary navigation">
          {navigation.map(([label, Icon]) => (
            <Link
              key={label}
              href={label === "Overview" ? "/" : `/${label.toLowerCase()}`}
              onClick={() => {
                setActive(label);
                setMobileOpen(false);
              }}
              className={`focus-ring flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${active === label ? "bg-[#e9efff] text-[#2557d6]" : "text-[#687485] hover:bg-[#f6f8fb] hover:text-[#17202a]"}`}
            >
              <Icon size={18} strokeWidth={1.8} />
              {label}
            </Link>
          ))}
        </nav>

        <div className="absolute bottom-6 left-5 right-5 rounded-xl border border-[#e7ebf0] p-3">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#dce4f7] text-xs font-bold text-[#2557d6]">
              {(workspace?.profile?.full_name ?? "User").slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">
                {workspace?.profile?.full_name ?? "Workspace user"}
              </div>
              <div className="truncate text-xs text-[#8993a2]">
                {workspace?.role ?? "Member"}
              </div>
            </div>
          </div>
        </div>
      </aside>

      {mobileOpen && (
        <button
          aria-label="Close navigation overlay"
          className="fixed inset-0 z-20 bg-black/20 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <main className="lg:pl-64">
        <header className="sticky top-0 z-10 flex h-20 items-center justify-between border-b border-[#e7ebf0] bg-white/95 px-5 backdrop-blur sm:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button className="lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open navigation">
              <Menu size={21} />
            </button>
            <div className="min-w-0">
              <div className="hidden text-xs text-[#8993a2] sm:block">
                {workspace?.organization?.name ?? "Your workspace"}
              </div>
              <h1 className="truncate text-xl font-semibold tracking-tight">
                Good morning, {workspace?.profile?.full_name?.split(" ")[0] ?? "there"}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                onClick={() => setShowNotifications((current) => !current)}
                className="focus-ring rounded-lg p-2.5 text-[#687485] hover:bg-[#f6f8fb]"
                aria-label="Notifications"
                aria-expanded={showNotifications}
              >
                <Bell size={19} />
                {notifications.some((notification) => !notification.read) && (
                  <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-[#c94d4d]" />
                )}
              </button>
              {showNotifications && (
                <div
                  role="dialog"
                  aria-label="Notifications"
                  className="absolute right-0 top-12 z-50 w-[min(20rem,calc(100vw-2rem))] rounded-xl border border-[#e7ebf0] bg-white p-3 shadow-xl"
                >
                  <div className="flex items-center justify-between px-2 py-1">
                    <h2 className="text-sm font-semibold">Notifications</h2>
                    <span className="text-xs text-[#8993a2]">
                      {notifications.filter((notification) => !notification.read).length} unread
                    </span>
                  </div>
                  <div className="mt-2 max-h-80 space-y-1 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="px-2 py-6 text-center text-sm text-[#8993a2]">
                        You’re all caught up.
                      </p>
                    ) : (
                      notifications.map((notification) => (
                        <button
                          key={notification.id}
                          onClick={() => markNotificationRead(notification.id)}
                          className={`block w-full rounded-lg px-2 py-2 text-left hover:bg-[#f6f8fb] ${notification.read ? "opacity-60" : ""}`}
                        >
                          <div className="text-sm font-semibold">{notification.title}</div>
                          <div className="mt-1 text-xs text-[#687485]">{notification.message}</div>
                          <div className="mt-1 text-[11px] text-[#8993a2]">
                            {new Date(notification.created_at).toLocaleString()}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="ml-2 hidden h-8 w-px bg-[#e7ebf0] sm:block" />

            <div className="relative">
              <button
                onClick={() => setProfileMenuOpen((current) => !current)}
                className="focus-ring flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-[#f6f8fb]"
                aria-label="Open profile menu"
                aria-expanded={profileMenuOpen}
              >
                <div className="grid h-8 w-8 place-items-center rounded-full bg-[#dce4f7] text-xs font-bold text-[#2557d6]">
                  {(workspace?.profile?.full_name ?? "User").slice(0, 2).toUpperCase()}
                </div>
                <ChevronDown size={15} className="text-[#8993a2]" />
              </button>
              {profileMenuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 top-12 z-50 w-48 rounded-xl border border-[#e7ebf0] bg-white p-2 shadow-xl"
                >
                  <div className="border-b border-[#eef1f5] px-3 py-2">
                    <div className="truncate text-sm font-semibold">
                      {workspace?.profile?.full_name ?? "Workspace user"}
                    </div>
                    <div className="text-xs text-[#8993a2]">{workspace?.role ?? "Member"}</div>
                  </div>
                  <button
                    role="menuitem"
                    onClick={logout}
                    className="mt-1 w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-[#a73f3f] hover:bg-[#fff7f7]"
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-[1440px] p-5 sm:p-8">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <div className="text-sm font-semibold text-[#2557d6]">Overview</div>
              <h2 className="mt-1 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
                Your business at a glance
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#687485]">
                See what is happening, handle the next task, and keep your numbers in one place.
              </p>
            </div>
            <button onClick={() => setShowCustomer(true)} className="btn-primary">
              <Plus size={17} />
              New customer
            </button>
          </div>

          {error && (
            <div role="alert" className="mt-6 flex items-start justify-between gap-4 rounded-xl border border-[#f1cccc] bg-[#fff7f7] px-4 py-3 text-sm text-[#a73f3f]">
              <span>{error}</span>
              <button className="font-semibold" onClick={() => setError(null)} aria-label="Dismiss error">
                Dismiss
              </button>
            </div>
          )}

          <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {metricCards.map(({ label, value, note, icon: Icon, color }) => (
              <div key={label} className="card-hover card p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-medium text-[#687485]">{label}</div>
                    <div className="metric-value mt-3 text-3xl font-semibold">
                      {loading ? (
                        <span className="inline-block h-8 w-24 animate-pulse rounded bg-[#edf0f5]" />
                      ) : (
                        value
                      )}
                    </div>
                    <div className="mt-2 text-xs text-[#8993a2]">{note}</div>
                  </div>
                  <div
                    className="rounded-xl p-2.5"
                    style={{ backgroundColor: `${color}15`, color }}
                  >
                    <Icon size={19} />
                  </div>
                </div>
              </div>
            ))}
          </section>

          <section className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_1fr]">
            <div className="card p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-semibold">Revenue overview</h3>
                  <p className="mt-1 text-sm text-[#8993a2]">A simple view of your current performance.</p>
                </div>
                <Link href="/reports" className="text-xs font-semibold text-[#2557d6] hover:underline">
                  View reports
                </Link>
              </div>
              <div className="mt-8 rounded-xl bg-[#f6f8fb] p-5">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <div className="text-xs uppercase tracking-wider text-[#8993a2]">Current period</div>
                    <div className="mt-2 text-3xl font-semibold tracking-tight">
                      {metrics ? money(metrics.revenue, currency) : "—"}
                    </div>
                  </div>
                  <div className="rounded-full bg-[#e6f5ef] px-3 py-1 text-xs font-semibold text-[#1c8c63]">
                    Net {metrics ? money(metrics.profit, currency) : "—"}
                  </div>
                </div>
                <div className="mt-6 h-2 overflow-hidden rounded-full bg-[#e2e7ee]">
                  <div
                    className="h-full rounded-full bg-[#2557d6] transition-all"
                    style={{
                      width: metrics && Number(metrics.revenue) > 0
                        ? `${Math.min(100, Math.max(0, (Number(metrics.profit) / Number(metrics.revenue)) * 100))}%`
                        : "0%",
                    }}
                  />
                </div>
                <div className="mt-2 flex justify-between text-xs text-[#8993a2]">
                  <span>Profit margin</span>
                  <span>
                    {metrics && Number(metrics.revenue) > 0
                      ? `${Math.round((Number(metrics.profit) / Number(metrics.revenue)) * 100)}%`
                      : "0%"}
                  </span>
                </div>
              </div>
            </div>

            <div className="card p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-semibold">Outstanding invoices</h3>
                  <p className="mt-1 text-sm text-[#8993a2]">Invoices that need attention.</p>
                </div>
                <Link href="/invoices" className="text-xs font-semibold text-[#2557d6] hover:underline">
                  View all
                </Link>
              </div>
              <div className="mt-5 space-y-3">
                {invoices.filter((invoice) => ["sent", "overdue"].includes(invoice.status)).slice(0, 4).map((invoice) => (
                  <div key={invoice.id} className="flex items-center justify-between rounded-xl border border-[#eef1f5] px-3 py-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold">{invoice.invoice_number}</div>
                      <div className="mt-1 text-xs capitalize text-[#8993a2]">{invoice.status}</div>
                    </div>
                    <div className="text-sm font-semibold">{money(invoice.total, currency)}</div>
                  </div>
                ))}
                {invoices.filter((invoice) => ["sent", "overdue"].includes(invoice.status)).length === 0 && (
                  <div className="rounded-xl bg-[#f6f8fb] px-4 py-8 text-center">
                    <div className="text-sm font-semibold">Nothing needs your attention</div>
                    <p className="mt-1 text-xs text-[#8993a2]">Outstanding invoices will show here.</p>
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="mt-6 grid gap-6 xl:grid-cols-[1fr_1fr]">
            <div className="card p-5 sm:p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="font-semibold">Customers</h3>
                  <p className="mt-1 text-sm text-[#8993a2]">Your latest customer relationships.</p>
                </div>
                <div className="relative w-48 max-w-[45%]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8993a2]" size={15} />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search"
                    className="field pl-9 text-xs"
                    aria-label="Search customers"
                  />
                </div>
              </div>
              <div className="mt-5 space-y-2">
                {filteredCustomers.slice(0, 5).map((customer) => (
                  <div key={customer.id} className="table-row flex items-center justify-between rounded-xl px-3 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#eef2ff] text-xs font-bold text-[#2557d6]">
                        {customer.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold">{customer.name}</div>
                        <div className="truncate text-xs text-[#8993a2]">{customer.company || customer.email || "No details added"}</div>
                      </div>
                    </div>
                    <span className="ml-3 shrink-0 rounded-full bg-[#edf8f4] px-2.5 py-1 text-[11px] font-semibold capitalize text-[#1c8c63]">
                      {customer.status}
                    </span>
                  </div>
                ))}
                {filteredCustomers.length === 0 && (
                  <div className="rounded-xl bg-[#f6f8fb] px-4 py-8 text-center text-sm text-[#8993a2]">
                    {query ? "No customers match your search." : "No customers yet."}
                  </div>
                )}
              </div>
              <Link href="/customers" className="mt-4 inline-block text-xs font-semibold text-[#2557d6] hover:underline">
                Manage customers →
              </Link>
            </div>

            <div className="card p-5 sm:p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold">Quick actions</h3>
                  <p className="mt-1 text-sm text-[#8993a2]">Jump straight to the work you do most.</p>
                </div>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <Link href="/customers" className="card-hover rounded-xl border border-[#e7ebf0] p-4">
                  <Users size={18} className="text-[#2557d6]" />
                  <div className="mt-4 text-sm font-semibold">Manage customers</div>
                  <div className="mt-1 text-xs text-[#8993a2]">Add, search, and update relationships.</div>
                </Link>
                <Link href="/invoices" className="card-hover rounded-xl border border-[#e7ebf0] p-4">
                  <FileText size={18} className="text-[#2557d6]" />
                  <div className="mt-4 text-sm font-semibold">Create invoice</div>
                  <div className="mt-1 text-xs text-[#8993a2]">Turn completed work into a payment request.</div>
                </Link>
                <Link href="/expenses" className="card-hover rounded-xl border border-[#e7ebf0] p-4">
                  <Receipt size={18} className="text-[#b97812]" />
                  <div className="mt-4 text-sm font-semibold">Record expense</div>
                  <div className="mt-1 text-xs text-[#8993a2]">Keep business costs up to date.</div>
                </Link>
                <Link href="/reports" className="card-hover rounded-xl border border-[#e7ebf0] p-4">
                  <ArrowUpRight size={18} className="text-[#1c8c63]" />
                  <div className="mt-4 text-sm font-semibold">View performance</div>
                  <div className="mt-1 text-xs text-[#8993a2]">See revenue, profit, and customer activity.</div>
                </Link>
              </div>
            </div>
          </section>
        </div>
      </main>

      {showCustomer && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#17202a]/35 p-5 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-[#e7ebf0] bg-white p-6 shadow-2xl sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-[#2557d6]">New customer</div>
                <h2 className="mt-1 text-2xl font-semibold tracking-tight">Add a customer</h2>
                <p className="mt-1 text-sm text-[#8993a2]">You can add more details later.</p>
              </div>
              <button className="rounded-lg p-2 text-[#687485] hover:bg-[#f6f8fb]" onClick={() => setShowCustomer(false)} aria-label="Close customer form">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={addCustomer} className="mt-6 space-y-4">
              <label className="block text-sm font-medium">
                Name
                <input value={customerName} onChange={(event) => setCustomerName(event.target.value)} className="field mt-2" placeholder="Jane Smith" required autoFocus />
              </label>
              <label className="block text-sm font-medium">
                Email
                <input value={customerEmail} onChange={(event) => setCustomerEmail(event.target.value)} className="field mt-2" placeholder="jane@example.com" type="email" />
              </label>
              <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                <button type="button" className="btn-secondary" onClick={() => setShowCustomer(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={savingCustomer}>
                  {savingCustomer ? "Adding…" : "Add customer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
