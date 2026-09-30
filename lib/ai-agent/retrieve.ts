import { cosineSimilarity } from "@/lib/ai-agent/embed"

export interface KnowledgeChunk {
  id: string
  sourceId?: string | null
  title?: string | null
  content: string
  embedding: number[]
  embedder: string
}

export interface RetrievedChunk {
  id: string
  sourceId?: string | null
  title?: string | null
  content: string
  similarity: number
}

export function rankChunks(query: number[], chunks: KnowledgeChunk[], embedder: string, limit = 4): RetrievedChunk[] {
  return chunks
    .filter((chunk) => chunk.embedder === embedder && chunk.embedding.length === query.length)
    .map((chunk) => ({
      id: chunk.id,
      sourceId: chunk.sourceId,
      title: chunk.title,
      content: chunk.content,
      similarity: cosineSimilarity(query, chunk.embedding),
    }))
    .sort((left, right) => right.similarity - left.similarity)
    .slice(0, limit)
}
