import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "BizPilot | Run your business in one place",
    template: "%s | BizPilot",
  },
  description:
    "A focused workspace for customers, invoices, payments, expenses, and business performance.",
  applicationName: "BizPilot",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
