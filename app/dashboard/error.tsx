"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { AlertTriangle } from "lucide-react"

export default function ErrorBoundary({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        // Log the error to an error reporting service
        console.error(error)
    }, [error])

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 text-center px-4">
            <div className="bg-red-500/10 p-4 rounded-full">
                <AlertTriangle className="h-10 w-10 text-red-500" />
            </div>
            <div className="space-y-2">
                <h2 className="text-2xl font-semibold tracking-tight text-white">Something went wrong</h2>
                <p className="text-zinc-400 max-w-[500px]">
                    An unexpected error occurred while loading this section. Please try again or contact support if the issue persists.
                </p>
            </div>
            <Button 
                onClick={reset}
                className="mt-4 bg-[#ffe14d] text-black hover:bg-[#ffe14d]/90 font-medium"
            >
                Try again
            </Button>
        </div>
    )
}
