"use client"

import React, { useState, useEffect, useCallback } from "react"
import * as ContextMenu from "@radix-ui/react-context-menu"
import * as Dialog from "@radix-ui/react-dialog"
import { cn } from "@/lib/utils"
import {
  CornerUpLeft,
  UserPlus,
  Tag,
  Check,
  Clock,
  Pause,
  Trash2,
  AlertTriangle,
} from "lucide-react"
import { toast } from "sonner"

export interface ConversationContextMenuProps {
  children: React.ReactNode
  conversationId?: string
  contactName?: string
  onReply?: () => void
  onAssign?: () => void
  onAddTag?: () => void
  onMarkDone?: () => void
  onSnooze?: () => void
  onPauseAi?: () => void
  onDelete?: () => void
  isFocused?: boolean
}

export function ConversationContextMenu({
  children,
  conversationId,
  contactName = "conversation",
  onReply,
  onAssign,
  onAddTag,
  onMarkDone,
  onSnooze,
  onPauseAi,
  onDelete,
  isFocused = false,
}: ConversationContextMenuProps) {
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)

  const handleReply = useCallback(() => {
    if (onReply) onReply()
    else toast.info(`Replying to ${contactName}`)
  }, [onReply, contactName])

  const handleAssign = useCallback(() => {
    if (onAssign) onAssign()
    else toast.info(`Assigning ${contactName}`)
  }, [onAssign, contactName])

  const handleAddTag = useCallback(() => {
    if (onAddTag) onAddTag()
    else toast.info(`Add tag to ${contactName}`)
  }, [onAddTag, contactName])

  const handleMarkDone = useCallback(() => {
    if (onMarkDone) onMarkDone()
    else toast.success(`Marked as done`)
  }, [onMarkDone])

  const handleSnooze = useCallback(() => {
    if (onSnooze) onSnooze()
    else toast.info(`Snoozed conversation`)
  }, [onSnooze])

  const handlePauseAi = useCallback(() => {
    if (onPauseAi) onPauseAi()
    else toast.info(`Paused AI for this chat`)
  }, [onPauseAi])

  const handleDeleteTrigger = useCallback(() => {
    setDeleteConfirmOpen(true)
  }, [])

  const handleConfirmDelete = () => {
    setDeleteConfirmOpen(false)
    if (onDelete) onDelete()
    else toast.success(`Deleted conversation with ${contactName}`)
  }

  // Keyboard shortcut listener when conversation element is focused
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Don't intercept if user is typing in an input/textarea
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase()
      if (tag === "input" || tag === "textarea") return

      const key = e.key.toLowerCase()
      if (key === "r" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault()
        handleReply()
      } else if (key === "a" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault()
        handleAssign()
      } else if (key === "t" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault()
        handleAddTag()
      } else if (key === "e" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault()
        handleMarkDone()
      } else if (key === "h" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault()
        handleSnooze()
      } else if (key === "p" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault()
        handlePauseAi()
      } else if (e.key === "Backspace" || e.key === "Delete") {
        e.preventDefault()
        handleDeleteTrigger()
      }
    },
    [handleReply, handleAssign, handleAddTag, handleMarkDone, handleSnooze, handlePauseAi, handleDeleteTrigger]
  )

  return (
    <>
      <ContextMenu.Root>
        <ContextMenu.Trigger asChild onKeyDown={handleKeyDown}>
          {children}
        </ContextMenu.Trigger>

        <ContextMenu.Portal>
          <ContextMenu.Content
            className="z-50 w-[240px] bg-[#0C0C0E] border border-[var(--line)] rounded-[20px] p-2 shadow-[0_20px_40px_rgba(0,0,0,0.6)] text-[var(--t1)] select-none focus:outline-none animate-in fade-in-50 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 duration-120"
          >
            {/* Reply */}
            <ContextMenu.Item
              onSelect={handleReply}
              className="h-[40px] rounded-[12px] px-3 flex items-center justify-between text-[13px] text-[var(--t1)] hover:bg-[var(--s3)] focus:bg-[var(--s3)] focus:outline-none cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <CornerUpLeft className="size-[17px] text-[var(--t2)]" />
                <span>Reply</span>
              </div>
              <span className="text-[11px] font-mono text-[var(--t3)]">R</span>
            </ContextMenu.Item>

            {/* Assign to... */}
            <ContextMenu.Item
              onSelect={handleAssign}
              className="h-[40px] rounded-[12px] px-3 flex items-center justify-between text-[13px] text-[var(--t1)] hover:bg-[var(--s3)] focus:bg-[var(--s3)] focus:outline-none cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <UserPlus className="size-[17px] text-[var(--t2)]" />
                <span>Assign to...</span>
              </div>
              <span className="text-[11px] font-mono text-[var(--t3)]">A</span>
            </ContextMenu.Item>

            {/* Add tag */}
            <ContextMenu.Item
              onSelect={handleAddTag}
              className="h-[40px] rounded-[12px] px-3 flex items-center justify-between text-[13px] text-[var(--t1)] hover:bg-[var(--s3)] focus:bg-[var(--s3)] focus:outline-none cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Tag className="size-[17px] text-[var(--t2)]" />
                <span>Add tag</span>
              </div>
              <span className="text-[11px] font-mono text-[var(--t3)]">T</span>
            </ContextMenu.Item>

            {/* Mark as done */}
            <ContextMenu.Item
              onSelect={handleMarkDone}
              className="h-[40px] rounded-[12px] px-3 flex items-center justify-between text-[13px] text-[var(--t1)] hover:bg-[var(--s3)] focus:bg-[var(--s3)] focus:outline-none cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Check className="size-[17px] text-[var(--t2)]" />
                <span>Mark as done</span>
              </div>
              <span className="text-[11px] font-mono text-[var(--t3)]">E</span>
            </ContextMenu.Item>

            {/* Snooze */}
            <ContextMenu.Item
              onSelect={handleSnooze}
              className="h-[40px] rounded-[12px] px-3 flex items-center justify-between text-[13px] text-[var(--t1)] hover:bg-[var(--s3)] focus:bg-[var(--s3)] focus:outline-none cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Clock className="size-[17px] text-[var(--t2)]" />
                <span>Snooze</span>
              </div>
              <span className="text-[11px] font-mono text-[var(--t3)]">H</span>
            </ContextMenu.Item>

            {/* Pause AI for chat */}
            <ContextMenu.Item
              onSelect={handlePauseAi}
              className="h-[40px] rounded-[12px] px-3 flex items-center justify-between text-[13px] text-[var(--t1)] hover:bg-[var(--s3)] focus:bg-[var(--s3)] focus:outline-none cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Pause className="size-[17px] text-[var(--t2)]" />
                <span>Pause AI for chat</span>
              </div>
              <span className="text-[11px] font-mono text-[var(--t3)]">P</span>
            </ContextMenu.Item>

            {/* 1px Separator */}
            <ContextMenu.Separator className="h-[1px] bg-[var(--line)] my-1.5" />

            {/* Delete conversation (red) */}
            <ContextMenu.Item
              onSelect={handleDeleteTrigger}
              className="h-[40px] rounded-[12px] px-3 flex items-center justify-between text-[13px] text-[var(--red)] hover:bg-[var(--redbg)] focus:bg-[var(--redbg)] focus:outline-none cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Trash2 className="size-[17px] text-[var(--red)]" />
                <span className="font-medium">Delete conversation</span>
              </div>
              <span className="text-[11px] font-mono text-[var(--red)]">⌫</span>
            </ContextMenu.Item>
          </ContextMenu.Content>
        </ContextMenu.Portal>
      </ContextMenu.Root>

      {/* Delete Confirmation Step Dialog */}
      <Dialog.Root open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 animate-in fade-in-0 duration-140" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-[360px] bg-[#0C0C0E] border border-[var(--line)] rounded-[20px] p-5 shadow-[0_20px_40px_rgba(0,0,0,0.8)] text-[var(--t1)] space-y-4 focus:outline-none">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-full bg-[var(--redbg)] border border-[rgba(242,85,90,0.25)] flex items-center justify-center text-[var(--red)] shrink-0">
                <AlertTriangle className="size-5" />
              </div>
              <div>
                <Dialog.Title className="text-[15px] font-semibold text-[var(--t1)]">
                  Delete conversation
                </Dialog.Title>
                <Dialog.Description className="text-[12px] text-[var(--t2)] mt-0.5">
                  Are you sure you want to delete the conversation with {contactName}? This action cannot be undone.
                </Dialog.Description>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="px-3.5 py-2 rounded-[10px] bg-[var(--s2)] hover:bg-[var(--s3)] text-[12.5px] font-medium text-[var(--t2)] hover:text-[var(--t1)] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </Dialog.Close>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-3.5 py-2 rounded-[10px] bg-[var(--red)] hover:bg-red-600 text-[12.5px] font-medium text-white transition-colors cursor-pointer"
              >
                Delete
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  )
}
