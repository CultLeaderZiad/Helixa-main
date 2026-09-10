"use client"

import ShapeGrid from "@/components/ui/ShapeGrid"

export function FrontBackground() {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none select-none overflow-hidden">
      <div className="absolute inset-0">
        <ShapeGrid
          speed={0.5}
          squareSize={40}
          direction="diagonal"
          borderColor="rgba(255, 255, 255, 0.16)"
          hoverFillColor="rgba(255, 255, 255, 0.14)"
          shape="square"
          hoverTrailAmount={5}
          vignetteColor="#03010A"
        />
      </div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(255,225,77,0.03)_0%,rgba(82,39,255,0.02)_40%,transparent_75%)] pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#03010A]/60 pointer-events-none" />
    </div>
  )
}

export default FrontBackground
