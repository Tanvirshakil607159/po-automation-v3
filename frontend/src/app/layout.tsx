import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PO Sorter — Garment Accessories Automation",
  description:
    "Automatically extract, sort, and calculate consumption from Purchase Order PDFs. Item-wise sorting with integrated wastage calculator.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-[#fafbfc] text-slate-900 min-h-screen">
        {children}
      </body>
    </html>
  );
}
