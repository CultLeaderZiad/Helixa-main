import React from "react"

interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string
  className?: string
}

/** Official Instagram Brand Icon (gradient rounded square with camera glyph) */
export function InstagramIcon({ size = 20, className = "", ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <defs>
        <radialGradient
          id="ig-radial-grad"
          cx="10%"
          cy="100%"
          r="150%"
          fx="10%"
          fy="100%"
        >
          <stop offset="0%" stopColor="#FFD521" />
          <stop offset="10%" stopColor="#F50000" />
          <stop offset="50%" stopColor="#B900B4" />
          <stop offset="100%" stopColor="#405DE6" />
        </radialGradient>
      </defs>
      <rect width="24" height="24" rx="6" fill="url(#ig-radial-grad)" />
      <path
        d="M12 7.03c-2.74 0-4.97 2.23-4.97 4.97 0 2.74 2.23 4.97 4.97 4.97s4.97-2.23 4.97-4.97c0-2.74-2.23-4.97-4.97-4.97zm0 8.2c-1.78 0-3.23-1.45-3.23-3.23 0-1.78 1.45-3.23 3.23-3.23 1.78 0 3.23 1.45 3.23 3.23 0 1.78-1.45 3.23-3.23 3.23zm6.33-8.38c0 .64-.52 1.16-1.16 1.16-.64 0-1.16-.52-1.16-1.16 0-.64.52-1.16 1.16-1.16.64 0 1.16.52 1.16 1.16zm2.6 1.18c-.06-1.28-.35-2.42-1.29-3.35-.94-.94-2.07-1.23-3.35-1.29-1.32-.08-5.27-.08-6.59 0-1.27.06-2.41.35-3.35 1.29-.94.94-1.23 2.07-1.29 3.35-.08 1.32-.08 5.27 0 6.59.06 1.28.35 2.42 1.29 3.35.94.94 2.07 1.23 3.35 1.29 1.32.08 5.27.08 6.59 0 1.28-.06 2.42-.35 3.35-1.29.94-.94 1.23-2.07 1.29-3.35.08-1.32.08-5.27 0-6.59zm-2.07 8.35c-.28.7-.82 1.24-1.52 1.52-1.05.42-3.55.32-4.74.32-1.19 0-3.69.09-4.74-.32-.7-.28-1.24-.82-1.52-1.52-.42-1.05-.32-3.55-.32-4.74 0-1.19-.09-3.69.32-4.74.28-.7.82-1.24 1.52-1.52 1.05-.42 3.55-.32 4.74-.32 1.19 0 3.69-.09 4.74.32.7.28 1.24.82 1.52 1.52.42 1.05.32 3.55.32 4.74 0 1.19.1 3.69-.32 4.74z"
        fill="#FFFFFF"
      />
    </svg>
  )
}

/** Official WhatsApp Brand Icon */
export function WhatsAppIcon({ size = 20, className = "", ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <circle cx="12" cy="12" r="12" fill="#25D366" />
      <path
        d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.16-.17.2-.35.22-.64.08-.3-.15-1.26-.46-2.39-1.48-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.08-.15-.67-1.61-.92-2.21-.24-.58-.49-.5-.67-.51-.17-.01-.37-.01-.57-.01-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.88 1.21 3.07.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35zM12.05 21.4a9.87 9.87 0 01-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.86 9.86 0 01-1.51-5.26c0-5.45 4.44-9.88 9.89-9.88 2.64 0 5.12 1.03 6.99 2.9a9.83 9.83 0 012.89 6.99c0 5.45-4.44 9.88-9.89 9.88z"
        fill="#FFFFFF"
      />
    </svg>
  )
}

/** Official Facebook Brand Icon */
export function FacebookIcon({ size = 20, className = "", ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <circle cx="12" cy="12" r="12" fill="#1877F2" />
      <path
        d="M14.73 12.07h-1.9v7.93h-3.27v-7.93H8.08V9.3h1.48V7.47c0-2.02 1.2-3.14 3.04-3.14.88 0 1.8.16 1.8.16v1.98h-1.01c-1 0-1.31.62-1.31 1.26v1.57h2.23l-.36 2.77z"
        fill="#FFFFFF"
      />
    </svg>
  )
}

/** Official Messenger Brand Icon (Meta Gradient speech bubble with lightning bolt) */
export function MessengerIcon({ size = 20, className = "", ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <defs>
        <linearGradient id="msg-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00B2FF" />
          <stop offset="50%" stopColor="#006AFF" />
          <stop offset="100%" stopColor="#A033FF" />
        </linearGradient>
      </defs>
      <circle cx="12" cy="12" r="12" fill="url(#msg-grad)" />
      <path
        d="M6.5 11.85c0-3.12 2.46-5.65 5.5-5.65s5.5 2.53 5.5 5.65c0 3.12-2.46 5.65-5.5 5.65-.58 0-1.14-.09-1.66-.26l-2.07.65.65-1.85c-1.46-1.01-2.42-2.49-2.42-4.19zm6.06-.82l-1.63 1.74-2.22-1.22c-.2-.11-.45-.04-.56.16-.04.07-.05.15-.03.23l1.1 2.54c.08.19.3.29.49.21.07-.03.13-.08.18-.14l1.63-1.74 2.22 1.22c.2.11.45.04.56-.16.04-.07.05-.15.03-.23l-1.1-2.54a.386.386 0 00-.49-.21.39.39 0 00-.18.14z"
        fill="#FFFFFF"
      />
    </svg>
  )
}

/** Official Telegram Brand Icon */
export function TelegramIcon({ size = 20, className = "", ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <circle cx="12" cy="12" r="12" fill="#229ED9" />
      <path
        d="M5.4 11.9l11.4-4.7c.5-.2 1 .1 1 .7 0 .2 0 .4-.1.5l-2 9.5c-.1.7-.6.9-1.1.6l-3.2-2.4-1.5 1.5c-.2.2-.3.3-.6.3l.2-3.3 6-5.4c.3-.2 0-.4-.3-.2l-7.4 4.7-3.2-1c-.7-.2-.7-.7.2-1.1z"
        fill="#FFFFFF"
      />
    </svg>
  )
}

/** Official TikTok Brand Icon with Duotone Cyan & Red Highlights */
export function TikTokIcon({ size = 20, className = "", ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <rect width="24" height="24" rx="6" fill="#000000" />
      <path
        d="M17.5 7.8a4.6 4.6 0 01-3.6-4.1V3h-3.1v12.8a2.6 2.6 0 01-2.6 2.3 2.6 2.6 0 01-2.6-2.6 2.6 2.6 0 012.6-2.6c.3 0 .5.04.7.1V9.7a5.7 5.7 0 00-.7-.05 5.8 5.8 0 00-5.8 5.8 5.8 5.8 0 005.8 5.8 5.8 5.8 0 005.8-5.8V9.6a7.5 7.5 0 004.4 1.4V8c-.3 0-.6-.1-.9-.2z"
        fill="#25F4EE"
        transform="translate(-0.4, -0.4)"
      />
      <path
        d="M17.5 7.8a4.6 4.6 0 01-3.6-4.1V3h-3.1v12.8a2.6 2.6 0 01-2.6 2.3 2.6 2.6 0 01-2.6-2.6 2.6 2.6 0 012.6-2.6c.3 0 .5.04.7.1V9.7a5.7 5.7 0 00-.7-.05 5.8 5.8 0 00-5.8 5.8 5.8 5.8 0 005.8 5.8 5.8 5.8 0 005.8-5.8V9.6a7.5 7.5 0 004.4 1.4V8c-.3 0-.6-.1-.9-.2z"
        fill="#FE2C55"
        transform="translate(0.4, 0.4)"
      />
      <path
        d="M17.5 7.8a4.6 4.6 0 01-3.6-4.1V3h-3.1v12.8a2.6 2.6 0 01-2.6 2.3 2.6 2.6 0 01-2.6-2.6 2.6 2.6 0 012.6-2.6c.3 0 .5.04.7.1V9.7a5.7 5.7 0 00-.7-.05 5.8 5.8 0 00-5.8 5.8 5.8 5.8 0 005.8 5.8 5.8 5.8 0 005.8-5.8V9.6a7.5 7.5 0 004.4 1.4V8c-.3 0-.6-.1-.9-.2z"
        fill="#FFFFFF"
      />
    </svg>
  )
}

/** WebChat Live Widget Icon */
export function WebChatIcon({ size = 20, className = "", ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <circle cx="12" cy="12" r="12" fill="#E5A93C" />
      <path
        d="M7 11.5c0-2.5 2.2-4.5 5-4.5s5 2 5 4.5c0 2.5-2.2 4.5-5 4.5-.7 0-1.4-.1-2-.4l-2.2.7.6-2c-.9-.8-1.4-1.7-1.4-2.8z"
        fill="#09090B"
      />
      <circle cx="9.8" cy="11.5" r="0.75" fill="#E5A93C" />
      <circle cx="12" cy="11.5" r="0.75" fill="#E5A93C" />
      <circle cx="14.2" cy="11.5" r="0.75" fill="#E5A93C" />
    </svg>
  )
}
