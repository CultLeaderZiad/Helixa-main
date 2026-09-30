import path from "node:path"
import { pathToFileURL } from "node:url"

export function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    let relativePath = specifier.slice(2)
    if (!path.extname(relativePath)) relativePath += ".ts"
    return nextResolve(pathToFileURL(path.join(process.cwd(), relativePath)).href, context)
  }
  return nextResolve(specifier, context)
}
