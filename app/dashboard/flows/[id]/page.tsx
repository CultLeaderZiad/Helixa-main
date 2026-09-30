"use client"

import { use } from "react"
import dynamic from "next/dynamic"
import useSWR from "swr"
import { fetcher } from "@/lib/fetcher"
import { Loader2 } from "lucide-react"
import type { FlowGraph } from "@/lib/flows/types"

const Canvas = dynamic(() => import("@/components/flows/FlowCanvas"), { ssr: false })

export default function FlowEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data, mutate, isLoading } = useSWR(`/api/flows/${id}`, fetcher)
  if (isLoading || !data?.flow) {
    return <div className="flex justify-center py-24"><Loader2 className="w-6 h-6 animate-spin text-white/30" /></div>
  }
  const versions = Array.isArray(data.versions) ? data.versions : []
  const latest = versions[0]
  const graph = (latest?.graph || { nodes: [], edges: [] }) as FlowGraph
  return (
    <Canvas
      flowId={id}
      name={data.flow.name}
      channel={data.flow.channel || "instagram"}
      status={data.flow.status}
      version={latest?.version || 1}
      graph={graph}
      stats={data.stats || []}
      performance={data.performance || { runs: 0, waiting: 0, completed: 0, clicks: 0 }}
      onSaved={() => mutate()}
    />
  )
}
