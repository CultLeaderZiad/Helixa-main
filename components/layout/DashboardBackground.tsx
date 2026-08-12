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
        color1="#5227FF"
        color2="#A855F7"
        color3="#FFFFFF"
        detail="medium"
        speed={0.7}
        waveDepth={1}
        zoom={1.3}
        density={10.0}
        glow={1.0}
        exposure={2700}
        spread={0.3}
        stepSize={0.002}
        colorShift={0}
        contrast={1}
        brightness={1.0}
        opacity={1.0}
        mouseInteraction={true}
        mouseStrength={0.1}
        mouseRadius={0.35}
        blur={0}
        grain={true}
        grainIntensity={0.03}
      />
    </div>
  );
}
