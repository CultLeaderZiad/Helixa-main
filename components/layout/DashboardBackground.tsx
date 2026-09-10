"use client";

import ShapeGrid from "@/components/ui/ShapeGrid";

export function DashboardBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-[#03010A] pointer-events-none select-none">
      <div className="absolute inset-0 opacity-40">
        <ShapeGrid
          speed={0.4}
          squareSize={44}
          direction="diagonal"
          borderColor="rgba(255,255,255,0.04)"
          hoverFillColor="#221e2f"
          shape="square"
          hoverTrailAmount={4}
        />
      </div>
      <div className="absolute inset-0 bg-gradient-to-br from-[#ffe14d]/[0.05] via-[#5227FF]/[0.04] to-[#03010A] opacity-80" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_20%,#03010A_95%)]" />
    </div>
  );
}
