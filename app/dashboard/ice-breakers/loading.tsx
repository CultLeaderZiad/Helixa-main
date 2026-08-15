import { Loader2 } from "lucide-react"

export default function Loading() {
    return (
        <div className="p-4 md:p-8 animate-in fade-in duration-500 w-full">
            <div className="space-y-6 max-w-2xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <div className="space-y-3">
                        <div className="h-8 w-40 bg-white/10 rounded animate-pulse" />
                        <div className="h-4 w-64 bg-white/5 rounded animate-pulse" />
                    </div>
                    <div className="h-10 w-32 bg-[#ffe14d]/20 rounded animate-pulse" />
                </div>

                <div className="space-y-4">
                    {[1, 2, 3].map((card) => (
                        <div key={card} className="bg-white/5 border border-white/10 p-4 rounded-xl space-y-3">
                            <div className="flex justify-between items-start gap-4">
                                <div className="flex-1 space-y-4">
                                    <div className="space-y-2">
                                        <div className="h-3 w-16 bg-white/10 rounded animate-pulse" />
                                        <div className="h-10 w-full bg-black/20 rounded animate-pulse" />
                                    </div>
                                    <div className="space-y-2">
                                        <div className="h-3 w-24 bg-white/10 rounded animate-pulse" />
                                        <div className="h-16 w-full bg-black/20 rounded animate-pulse" />
                                    </div>
                                </div>
                                <div className="w-8 h-8 rounded bg-white/5 animate-pulse" />
                            </div>
                        </div>
                    ))}
                    
                    <div className="h-10 w-full rounded border border-dashed border-white/20 bg-white/5 animate-pulse" />
                </div>
                
                <div className="bg-white/[0.04] border border-white/10 p-4 rounded-xl h-16 animate-pulse" />
            </div>
        </div>
    )
}
