"use client";

import ShapeGrid from "@/components/ui/ShapeGrid";

export function DashboardBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-[#090a0d] pointer-events-none select-none">
      <div className="absolute inset-0 opacity-30">
        <ShapeGrid
          speed={0.4}
          squareSize={44}
          direction="diagonal"
          borderColor="rgba(255,255,255,0.03)"
          hoverFillColor="#18191f"
          shape="square"
          hoverTrailAmount={4}
        />
      </div>
      <div className="absolute inset-0 bg-gradient-to-br from-[#e5a93c]/[0.03] via-transparent to-[#090a0d] opacity-90" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_20%,#090a0d_95%)]" />
    </div>
  );
}
