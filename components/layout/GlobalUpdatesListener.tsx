"use client"

import { useEffect } from "react"
import { getSupabaseBrowserClient } from "@/lib/supabase-client"
import { toast } from "sonner"
import { Bell } from "lucide-react"
import React from "react"

export function GlobalUpdatesListener() {
    useEffect(() => {
        const supabase = getSupabaseBrowserClient()

        // Listen for new rows in the 'updates' table, or however we broadcast.
        // Assuming we have an 'updates' table or we just listen to a broadcast channel.
        // Let's use a broadcast channel for global ephemeral messages:
        const channel = supabase.channel('global-updates')
            .on(
                'broadcast',
                { event: 'admin-update' },
                (payload) => {
                    toast.info(payload.payload.message || "New admin update!", {
                        icon: <Bell className="w-4 h-4 text-blue-400" />,
                        duration: 8000,
                    })
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [])

    return null
}
