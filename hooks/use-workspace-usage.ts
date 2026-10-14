"use client"

import useSWR from "swr"
import type { WorkspaceUsageResult } from "@/lib/billing/workspace-usage"

const fetcher = (url: string) => fetch(url).then((res) => {
  if (!res.ok) throw new Error("Failed to load workspace usage")
  return res.json()
})

export function useWorkspaceUsage() {
  const { data, error, isLoading, mutate } = useSWR<WorkspaceUsageResult>(
    "/api/billing/workspace-usage",
    fetcher,
    {
      revalidateOnFocus: true,
      dedupingInterval: 15000,
    }
  )

  return {
    usage: data,
    isLoading,
    isError: !!error,
    mutate,
  }
}
