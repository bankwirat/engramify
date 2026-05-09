import { getAllMemories, MemoryRow, bm25ChunkSearch, vecChunkSearch, getChunksByIds, ChunkRow } from './db';

// ── Legacy semantic search over memories ────────────────────────────────────

function cosineSimilarity(vecA: number[], vecB: number[]): number {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dot   += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export interface RetrievalResult {
  text: string;
  similarity: number;
  timestamp: string;
}

export function retrieveSimilarMemories(queryEmbedding: number[], topK = 5): RetrievalResult[] {
  return getAllMemories()
    .map((row: MemoryRow) => ({
      text: row.text,
      similarity: cosineSimilarity(queryEmbedding, JSON.parse(row.embedding)),
      timestamp: row.timestamp,
    }))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);
}

// ── Hybrid search over chunks ────────────────────────────────────────────────

export interface HybridResult {
  file: string;
  path: string;
  heading: string;
  content: string;
  score: number;
}

function rrf(
  bm25Results: Array<{ id: number; rank: number }>,
  vecResults:  Array<{ id: number; rank: number }>,
  k = 60,
): number[] {
  const scores = new Map<number, number>();
  for (const { id, rank } of bm25Results) {
    scores.set(id, (scores.get(id) ?? 0) + 1 / (rank + k));
  }
  for (const { id, rank } of vecResults) {
    scores.set(id, (scores.get(id) ?? 0) + 1 / (rank + k));
  }
  return [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => id);
}

export function hybridSearch(queryEmbedding: number[], query: string, topK = 5): HybridResult[] {
  const bm25Raw = bm25ChunkSearch(query, 20);
  const vecRaw  = vecChunkSearch(queryEmbedding, 20);

  const bm25Ranked = bm25Raw.map((r, i) => ({ id: r.id, rank: i }));
  const vecRanked  = vecRaw.map((r, i)  => ({ id: r.id, rank: i }));

  const rankedIds = rrf(bm25Ranked, vecRanked);
  const topIds    = rankedIds.slice(0, topK);
  const chunks    = getChunksByIds(topIds);

  const scoreByRank = new Map(rankedIds.map((id, i) => [id, 1 / (i + 1)]));

  return chunks.map((c: ChunkRow) => ({
    file:    c.file,
    path:    c.path,
    heading: c.heading,
    content: c.content,
    score:   scoreByRank.get(c.id) ?? 0,
  }));
}
