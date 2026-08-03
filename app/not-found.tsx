"use client"
import Link from "next/link"

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#03010A] text-white flex items-center justify-center p-4">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">404 - Not Found</h1>
        <p className="text-neutral-400">The page you are looking for does not exist.</p>
        <Link href="/" className="inline-block mt-4 bg-white/10 hover:bg-white/20 px-6 py-2 rounded-lg font-medium transition-colors">
          Return Home
        </Link>
      </div>
    </div>
  )
}
