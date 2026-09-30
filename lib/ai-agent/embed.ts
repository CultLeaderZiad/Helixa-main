export const EMBEDDING_DIM = 384

export type EmbedderName = "hash-v1" | "openai-3-small-384"

function fnv(value: string): number {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function normalizeVector(vector: number[]): number[] {
  let sum = 0
  for (const value of vector) sum += value * value
  const norm = Math.sqrt(sum)
  if (!norm) return vector
  return vector.map((value) => value / norm)
}

/** Deterministic bag-of-tokens embedding. Same text always lands in the same place. */
export function hashEmbedding(text: string): number[] {
  const vector = new Array<number>(EMBEDDING_DIM).fill(0)
  const folded = text.toLowerCase().replace(/[^\w\u0600-\u06FF]+/g, " ").trim()
  const tokens = folded.split(/\s+/).filter((token) => token.length > 1)
  const grams = [...tokens]
  for (const token of tokens) {
    for (let index = 0; index < token.length - 2; index += 1) grams.push(token.slice(index, index + 3))
  }
  for (const token of grams) {
    const hash = fnv(token)
    const bucket = hash % EMBEDDING_DIM
    vector[bucket] += (hash & 1) === 0 ? 1 : -1
  }
  return normalizeVector(vector)
}

export function cosineSimilarity(left: number[], right: number[]): number {
  const length = Math.min(left.length, right.length)
  let dot = 0
  let leftNorm = 0
  let rightNorm = 0
  for (let index = 0; index < length; index += 1) {
    dot += left[index] * right[index]
    leftNorm += left[index] * left[index]
    rightNorm += right[index] * right[index]
  }
  if (!leftNorm || !rightNorm) return 0
  return dot / Math.sqrt(leftNorm * rightNorm)
}

export function vectorLiteral(vector: number[]): string {
  return `[${vector.map((value) => Number(value.toFixed(6))).join(",")}]`
}

export async function embedText(
  text: string,
  fetchImpl: typeof fetch = fetch,
): Promise<{ vector: number[]; embedder: EmbedderName }> {
  const key = process.env.OPENAI_API_KEY
  if (!key) return { vector: hashEmbedding(text), embedder: "hash-v1" }
  try {
    const response = await fetchImpl("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "text-embedding-3-small", input: text.slice(0, 8000), dimensions: EMBEDDING_DIM }),
    })
    const json = await response.json().catch(() => null)
    const vector = json?.data?.[0]?.embedding
    if (!response.ok || !Array.isArray(vector) || vector.length !== EMBEDDING_DIM) {
      return { vector: hashEmbedding(text), embedder: "hash-v1" }
    }
    return { vector, embedder: "openai-3-small-384" }
  } catch {
    return { vector: hashEmbedding(text), embedder: "hash-v1" }
  }
}
