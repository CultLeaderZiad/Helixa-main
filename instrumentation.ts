export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { installProcessHooks } = await import("./lib/monitoring")
    installProcessHooks()
  }
}
