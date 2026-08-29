import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  CircleDollarSign,
  FileText,
  Receipt,
  Sparkles,
  Users,
} from "lucide-react";

const stats = [
  ["$24,860", "Revenue", CircleDollarSign],
  ["$7,420", "Expenses", Receipt],
  ["$17,440", "Net profit", BarChart3],
  ["148", "Customers", Users],
] as const;

const invoices = [
  ["INV-00124", "Northstar Studio", "$2,450", "Paid"],
  ["INV-00123", "Brightline Foods", "$1,280", "Sent"],
  ["INV-00122", "Apex Works", "$860", "Overdue"],
];

export default function DemoPage() {
  return (
    <main className="min-h-screen bg-[#f6f8fb] text-[#17202a]">
      <header className="border-b border-[#e7ebf0] bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
          <div>
            <div className="text-xl font-bold tracking-tight">
              Biz<span className="text-[#2557d6]">Pilot</span>
            </div>
            <div className="mt-1 text-[11px] font-medium uppercase tracking-[0.18em] text-[#8993a2]">
              Product demo
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/login" className="btn-secondary">Sign in</Link>
            <Link href="/login" className="btn-primary">Try BizPilot <ArrowRight size={16} /></Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-5 pb-16 pt-14 sm:px-8 sm:pt-20">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#dce4f7] bg-white px-3 py-1.5 text-xs font-semibold text-[#2557d6] shadow-sm">
            <Sparkles size={14} /> Small-business operations in one place
          </div>
          <h1 className="mt-6 text-4xl font-semibold tracking-[-0.05em] sm:text-6xl">
            Keep customers, invoices, payments, and expenses moving together.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-[#687485] sm:text-lg">
            BizPilot gives a small business one workspace for everyday financial operations, team access, and clear reporting.
          </p>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map(([labelValue, label, Icon]) => (
            <div key={label} className="card p-5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#687485]">{label}</span>
                <Icon size={18} className="text-[#2557d6]" />
              </div>
              <div className="mt-4 text-2xl font-semibold tracking-tight">{labelValue}</div>
              <div className="mt-1 text-xs text-[#8993a2]">Demo workspace data</div>
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <section className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-[#e7ebf0] px-5 py-4">
              <div>
                <div className="text-sm font-semibold">Recent invoices</div>
                <div className="mt-1 text-xs text-[#8993a2]">A quick look at current receivables</div>
              </div>
              <FileText size={18} className="text-[#8993a2]" />
            </div>
            <div className="divide-y divide-[#eef1f5]">
              {invoices.map(([number, customer, amount, status]) => (
                <div key={number} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="text-sm font-semibold">{number}</div>
                    <div className="mt-1 text-xs text-[#8993a2]">{customer}</div>
                  </div>
                  <div className="flex items-center justify-between gap-6 sm:justify-end">
                    <div className="text-sm font-semibold">{amount}</div>
                    <span className="rounded-full bg-[#f1f4f8] px-2.5 py-1 text-xs font-semibold text-[#687485]">{status}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="card p-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e9efff] text-[#2557d6]">
              <CheckCircle2 size={20} />
            </div>
            <h2 className="mt-5 text-xl font-semibold tracking-tight">Built for real workflows</h2>
            <p className="mt-3 text-sm leading-6 text-[#687485]">
              Add a customer, build an invoice, record a payment, track costs, and review the numbers without jumping between separate tools.
            </p>
            <div className="mt-6 space-y-3 text-sm text-[#3f4a59]">
              <div className="flex gap-2"><CheckCircle2 size={17} className="mt-0.5 text-[#1c8c63]" /> Multi-organization workspace model</div>
              <div className="flex gap-2"><CheckCircle2 size={17} className="mt-0.5 text-[#1c8c63]" /> Role-aware settings and access</div>
              <div className="flex gap-2"><CheckCircle2 size={17} className="mt-0.5 text-[#1c8c63]" /> PDF invoice export and payment tracking</div>
            </div>
          </section>
        </div>
      </section>

      <section className="border-t border-[#e7ebf0] bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-10 sm:px-8 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-lg font-semibold">Ready to explore the real app?</div>
            <div className="mt-1 text-sm text-[#687485]">Sign in to use the full workspace.</div>
          </div>
          <Link href="/login" className="btn-primary">Open BizPilot <ArrowRight size={16} /></Link>
        </div>
      </section>
    </main>
  );
}
