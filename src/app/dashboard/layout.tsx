import React from "react";
import { Sidebar } from "@/components/Sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[var(--bg-base)] flex flex-col">
      <Sidebar />
      <div className="lg:pl-72 flex-1 flex flex-col min-w-0">
        <main className="flex-1 pb-16">
          {children}
        </main>
      </div>
    </div>
  );
}
