"use client";

import dynamic from "next/dynamic";

// Lazy-load AcidSquares so the heavy WebGL code doesn't block first paint
const AcidSquares = dynamic(() => import("@/components/ui/AcidSquares"), {
  ssr: false,
});

/**
 * Fixed full-screen AcidSquares backdrop tuned to Helixa's brand palette.
 * Renders behind all dashboard content at a low opacity so cards remain readable.
 */
export function DashboardBackground() {
  return (
    <div
      className="fixed inset-0 z-0 pointer-events-none"
      style={{ width: "100vw", height: "100vh" }}
    >
      <AcidSquares
        color1="#1a0d00"
        color2="#a18110"
        color3="#ffe14d"
        detail="low"
        speed={0.3}
        waveDepth={0.6}
        zoom={1.6}
        density={12.0}
        glow={0.6}
        exposure={3200}
        spread={0.25}
        stepSize={0.002}
        colorShift={0}
        contrast={0.9}
        brightness={0.7}
        opacity={0.12}
        mouseInteraction={false}
        mouseStrength={0}
        mouseRadius={0}
        blur={0.3}
        grain={true}
        grainIntensity={0.03}
      />
    </div>
  );
}
