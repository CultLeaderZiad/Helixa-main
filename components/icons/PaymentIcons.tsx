import React from "react"

interface PaymentIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string
  className?: string
}

/** Official Vodafone Brand Roundel (signature red circle with white quotation mark opening) */
export function VodafoneIcon({ size = 24, className = "", ...props }: PaymentIconProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <circle cx="16" cy="16" r="16" fill="#E60000" />
      {/* Signature Vodafone speech-mark / quotation aperture */}
      <path
        d="M17.8 8.4c-4.2 0-7.6 3.4-7.6 7.6 0 2.2 1 4.2 2.5 5.5l-2.2 2.2 1.8 1.8 2.3-2.3c1 .5 2.1.8 3.2.8 4.2 0 7.6-3.4 7.6-7.6s-3.4-8-7.6-8zm-.3 11.8c-2.3 0-4.2-1.9-4.2-4.2s1.9-4.2 4.2-4.2 4.2 1.9 4.2 4.2-1.9 4.2-4.2 4.2z"
        fill="#FFFFFF"
      />
      <circle cx="17.5" cy="16" r="2.2" fill="#E60000" />
    </svg>
  )
}

/** Official Vodafone Cash Full Badge / Logo with crisp contrast */
export function VodafoneCashBadge({ className = "", height = 26 }: { className?: string; height?: number }) {
  return (
    <div
      className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded-[5px] bg-white text-black shadow-xs select-none border border-[var(--line2)] ${className}`}
      style={{ height: `${height}px` }}
    >
      <img
        src="/vodafone-cash.png"
        alt="Vodafone Cash"
        style={{ height: `${height - 6}px`, width: "auto", objectFit: "contain" }}
        className="shrink-0"
      />
    </div>
  )
}

/** Email Payment Request Icon */
export function EmailPaymentIcon({ size = 24, className = "", ...props }: PaymentIconProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <rect width="32" height="32" rx="8" fill="#D6AE5C" />
      <path
        d="M8 11a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H10a2 2 0 01-2-2V11zm2 0l6 4.5L22 11H10zm12 2.2l-5.4 4.05a1 1 0 01-1.2 0L10 13.2V21h12v-7.8z"
        fill="#000000"
      />
    </svg>
  )
}

/** Official Stripe Brand Icon */
export function StripeIcon({ size = 24, className = "", ...props }: PaymentIconProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <rect width="32" height="32" rx="8" fill="#635BFF" />
      <path
        d="M14.6 13.4c0-.7.6-1 1.6-1 1.4 0 3.2.4 4.5 1.2v-3.7c-1.5-.6-3.1-.8-4.5-.8-3.7 0-6.1 1.9-6.1 5.2 0 5.1 7 4.3 7 6.5 0 .8-.7 1.1-1.8 1.1-1.6 0-3.6-.7-5.1-1.5v3.8c1.7.7 3.5 1.1 5.1 1.1 3.8 0 6.3-1.9 6.3-5.2-.1-5.5-7-4.5-7-6.7z"
        fill="#FFFFFF"
      />
    </svg>
  )
}

/** Official Paymob Brand Icon */
export function PaymobIcon({ size = 24, className = "", ...props }: PaymentIconProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <rect width="32" height="32" rx="8" fill="#0070F3" />
      {/* Official Paymob "P" Mob Mark */}
      <path
        d="M10 8h6.5c3.6 0 6.5 2.6 6.5 5.8s-2.9 5.8-6.5 5.8H14v4.4h-4V8zm4 3.6v4.4h2.5c1.7 0 3-1 3-2.2s-1.3-2.2-3-2.2H14z"
        fill="#FFFFFF"
      />
    </svg>
  )
}

/** Official Visa Card Icon */
export function VisaIcon({ size = 24, className = "", ...props }: PaymentIconProps) {
  return (
    <svg
      viewBox="0 0 32 20"
      width={size}
      height={(Number(size) * 20) / 32}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <rect width="32" height="20" rx="3" fill="#1434CB" />
      <path
        d="M13.2 14.5l1.6-9h2.5l-1.6 9h-2.5zm7.3-8.8c-.5-.2-1.3-.4-2.3-.4-2.5 0-4.3 1.3-4.3 3.2 0 1.4 1.3 2.2 2.2 2.6 1 .5 1.3.8 1.3 1.2 0 .7-.8 1-1.6 1-.9 0-1.5-.1-2.3-.5l-.3-.2-.3 1.9c.5.2 1.5.4 2.6.4 2.7 0 4.5-1.3 4.5-3.3 0-1.1-.7-2-2.2-2.7-.9-.5-1.5-.8-1.5-1.2 0-.4.5-.8 1.5-.8.8 0 1.4.2 1.9.4l.2.1.8-1.7zm5.5 0h-2c-.6 0-1.1.2-1.3.8l-3.8 8h2.6l.5-1.4h3.2l.3 1.4h2.3l-1.8-8.8zm-3.3 5.5l1.3-3.6.8 3.6h-2.1zm-15.1-5.5l-2.4 6.2-.3-1.4c-.4-1.5-1.8-3.1-3.3-3.9l2.1 7.1h2.7l4-8h-2.8z"
        fill="#FFFFFF"
      />
    </svg>
  )
}

/** Official Mastercard Brand Icon */
export function MastercardIcon({ size = 24, className = "", ...props }: PaymentIconProps) {
  return (
    <svg
      viewBox="0 0 32 20"
      width={size}
      height={(Number(size) * 20) / 32}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <rect width="32" height="20" rx="3" fill="#1E2329" />
      <circle cx="12" cy="10" r="6" fill="#EB001B" />
      <circle cx="20" cy="10" r="6" fill="#F79E1B" fillOpacity="0.9" />
      <path
        d="M16 5.8a5.96 5.96 0 00-2.4 4.2 5.96 5.96 0 002.4 4.2 5.96 5.96 0 002.4-4.2 5.96 5.96 0 00-2.4-4.2z"
        fill="#FF5F00"
      />
    </svg>
  )
}

/** Official InstaPay Brand Icon (Egypt Instant Payment Network) */
export function InstaPayIcon({ size = 24, className = "", ...props }: PaymentIconProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <rect width="32" height="32" rx="8" fill="#582C83" />
      <path
        d="M10 10h4v12h-4V10zm8 0h4v12h-4V10z"
        fill="#FFFFFF"
      />
      <circle cx="12" cy="7" r="1.5" fill="#E5A93C" />
      <circle cx="20" cy="7" r="1.5" fill="#E5A93C" />
    </svg>
  )
}
