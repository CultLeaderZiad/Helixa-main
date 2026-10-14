"use client"

import React, { useEffect } from "react"
import * as Dialog from "@radix-ui/react-dialog"
import { cn } from "@/lib/utils"
import { SidebarTree } from "./SidebarTree"
import { X } from "lucide-react"

export interface MobileDrawerProps {
  isOpen: boolean
  onClose: () => void
  username?: string
  email?: string | null
  userRole?: string | null
  plan?: string | null
  onLogout?: () => void
}

export function MobileDrawer({
  isOpen,
  onClose,
  username,
  email,
  userRole,
  plan,
  onLogout,
}: MobileDrawerProps) {
  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [isOpen])

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        {/* 50% Scrim Backdrop */}
        <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 animate-in fade-in-0 duration-140" />

        <Dialog.Content
          aria-describedby={undefined}
          className="fixed inset-y-0 start-0 z-50 w-[316px] max-w-[85vw] bg-[var(--s1)] border-e border-[var(--line)] shadow-[0_20px_40px_rgba(0,0,0,0.8)] focus:outline-none flex flex-col animate-in slide-in-from-start duration-140"
        >
          <Dialog.Title className="sr-only">Main Navigation Menu</Dialog.Title>

          {/* Close button in top-end corner */}
          <div className="absolute top-3 end-3 z-20">
            <Dialog.Close asChild>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close navigation drawer"
                className="size-8 rounded-[8px] bg-[var(--s2)] hover:bg-[var(--s3)] text-[var(--t2)] hover:text-[var(--t1)] flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </Dialog.Close>
          </div>

          {/* Render SidebarTree with 42px parent and 38px child rows */}
          <SidebarTree
            className="w-full max-w-none border-e-0"
            isDrawer={true}
            username={username}
            email={email}
            userRole={userRole}
            plan={plan}
            onLogout={onLogout}
            onNavigate={onClose}
          />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
