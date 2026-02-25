import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PO Sorter v3.0 — Garment Accessories Automation",
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
      <body className={`${inter.variable} antialiased bg-white text-gray-800`}>
        {children}
      </body>
    </html>
  );
}
