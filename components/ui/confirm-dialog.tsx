"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Loader2, AlertTriangle } from "lucide-react"

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  loading?: boolean
  onConfirm: () => void | Promise<void>
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  loading = false,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!loading) onOpenChange(o) }}>
      <DialogContent className="bg-[#0B0812] border-white/10 text-white sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-[#e5a93c]" />
            {title}
          </DialogTitle>
          <DialogDescription className="text-neutral-400 leading-relaxed">
            {description}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-4 flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="border-white/10 text-neutral-300 hover:bg-white/5"
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="bg-[#e5a93c] hover:bg-[#d4952b] text-black font-semibold"
          >
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ConfirmDialog
