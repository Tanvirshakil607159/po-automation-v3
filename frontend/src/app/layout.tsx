import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "PO Sorter — Garment Accessories Automation",
  description: "Upload PO PDFs, sort by item, calculate consumption.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased bg-[#f4f1ec] text-[#3b3730]`}>
        {children}
      </body>
    </html>
  );
}
