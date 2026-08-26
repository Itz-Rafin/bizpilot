import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BizPilot | Run your entire small business from one place",
  description: "A focused workspace for customers, invoices, payments, expenses, and business performance.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
