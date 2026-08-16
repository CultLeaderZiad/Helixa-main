"use client";

/**
 * High-performance full-screen background tuned to Helixa's brand palette.
 * Replaces the GPU-heavy WebGL AcidSquares backdrop with lightweight CSS-animated mesh gradient.
 * This drops CPU/GPU usage to practically 0% and eliminates all UI lag/stuttering.
 */
export function DashboardBackground() {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden bg-[#03010A] pointer-events-none select-none">
      {/* Glow Blobs */}
      <div 
        className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vh] rounded-full bg-[#5227FF]/10 blur-[120px]" 
        style={{
          animation: "floatBlob1 25s infinite alternate ease-in-out",
        }}
      />
      <div 
        className="absolute bottom-[-10%] right-[-10%] w-[60vw] h-[60vh] rounded-full bg-[#A855F7]/10 blur-[130px]" 
        style={{
          animation: "floatBlob2 30s infinite alternate ease-in-out",
        }}
      />
      <div 
        className="absolute top-[30%] right-[20%] w-[35vw] h-[35vh] rounded-full bg-[#ffe14d]/05 blur-[100px]" 
        style={{
          animation: "floatBlob3 20s infinite alternate ease-in-out",
        }}
      />

      {/* Grid Pattern overlay */}
      <div 
        className="absolute inset-0 opacity-[0.02] bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:24px_24px]" 
      />

      {/* Radial fade mask */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_30%,#03010A_95%)]" />

      <style>{`
        @keyframes floatBlob1 {
          0% { transform: translate(0px, 0px) scale(1); }
          50% { transform: translate(40px, 60px) scale(1.1); }
          100% { transform: translate(-20px, -40px) scale(0.95); }
        }
        @keyframes floatBlob2 {
          0% { transform: translate(0px, 0px) scale(1); }
          50% { transform: translate(-60px, -30px) scale(0.9); }
          100% { transform: translate(30px, 40px) scale(1.1); }
        }
        @keyframes floatBlob3 {
          0% { transform: translate(0px, 0px) scale(1); }
          50% { transform: translate(50px, -50px) scale(1.15); }
          100% { transform: translate(-30px, 20px) scale(0.9); }
        }
      `}</style>
    </div>
  );
}
