export async function qrSvg(value: string): Promise<string> {
  const qr = await import("qrcode")
  const toString = typeof qr.toString === "function" ? qr.toString.bind(qr) : qr.default.toString.bind(qr.default)
  return toString(value, {
    type: "svg",
    margin: 1,
    color: { dark: "#16171d", light: "#ffffff" },
  })
}
