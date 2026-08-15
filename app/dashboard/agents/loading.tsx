import { Loader2 } from "lucide-react"

export default function Loading() {
    return (
        <div className="p-8 animate-in fade-in duration-500 w-full">
            {/* Header Skeleton */}
            <div className="mb-8 space-y-3">
                <div className="h-10 w-48 bg-white/10 rounded animate-pulse" />
                <div className="h-4 w-96 bg-white/5 rounded animate-pulse" />
            </div>

            {/* Category Groups Skeleton */}
            {[1, 2].map((category) => (
                <div key={category} className="mb-12">
                    <div className="h-6 w-32 bg-white/10 rounded mb-4 animate-pulse" />
                    
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {[1, 2, 3].map((card) => (
                            <div key={card} className="border border-white/10 bg-white/[0.03] rounded-xl p-6 flex flex-col gap-4">
                                <div className="space-y-3">
                                    <div className="h-5 w-3/4 bg-white/10 rounded animate-pulse" />
                                    <div className="space-y-2">
                                        <div className="h-3 w-full bg-white/5 rounded animate-pulse" />
                                        <div className="h-3 w-5/6 bg-white/5 rounded animate-pulse" />
                                        <div className="h-3 w-4/6 bg-white/5 rounded animate-pulse" />
                                    </div>
                                </div>
                                
                                <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
                                    <div className="h-8 w-24 bg-white/10 rounded animate-pulse" />
                                    <div className="flex items-center gap-2">
                                        <div className="h-3 w-12 bg-white/5 rounded animate-pulse" />
                                        <div className="h-5 w-10 bg-white/10 rounded-full animate-pulse" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
            
            <div className="flex justify-center py-4">
                <Loader2 className="w-6 h-6 text-white/20 animate-spin" />
            </div>
        </div>
    )
}
