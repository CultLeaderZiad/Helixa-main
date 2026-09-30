import { widgetScript } from "@/lib/webchat/widget-script"

export function GET() {
  return new Response(widgetScript(), {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  })
}
