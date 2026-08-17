"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useIsMobile } from "@/components/ui/use-mobile";

const AcidSquares = dynamic(() => import("@/components/ui/AcidSquares"), { ssr: false });

export function DashboardBackground() {
  const isMobile = useIsMobile();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(false); // Reset on unmount
    setMounted(true);
  }, []);

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-[#03010A] pointer-events-none select-none">
      {mounted && !isMobile ? (
        <div className="absolute inset-0 pointer-events-none opacity-40">
          <AcidSquares
            color1="#ffe14d"
            color2="#5227FF"
            color3="#ffffff"
            detail="medium"
            speed={0.4}
            waveDepth={1.5}
            zoom={1.2}
            density={8}
            glow={0.8}
            exposure={2000}
            spread={0.4}
            stepSize={0.003}
            blur={0}
            grain={true}
            grainIntensity={0.05}
          />
        </div>
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-[#ffe14d]/10 via-[#5227FF]/10 to-[#03010A] opacity-60" />
      )}
      {/* Radial fade mask */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_30%,#03010A_95%)]" />
    </div>
  );
}
