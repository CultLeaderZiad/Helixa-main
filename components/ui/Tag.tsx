import * as React from "react"
import { cn } from "@/lib/utils"

interface TagProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode
}

export function Tag({ className, children, ...props }: TagProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-1.5 py-0.5 rounded-[4px] bg-[var(--s3)] border border-[var(--line2)] text-[var(--t2)] font-mono text-[11.5px] leading-tight select-none",
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
}
