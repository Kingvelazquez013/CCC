import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Claude Command Center",
  description: "Business governance dashboard for Claude Code",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-surface-0 text-zinc-50 antialiased">
        {children}
      </body>
    </html>
  );
}
