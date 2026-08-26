"use client";

export function DashboardBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-[#03010A] pointer-events-none select-none">
      <div className="absolute inset-0 bg-gradient-to-br from-[#ffe14d]/[0.07] via-[#5227FF]/[0.05] to-[#03010A] opacity-80" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_30%,#03010A_95%)]" />
    </div>
  );
}
