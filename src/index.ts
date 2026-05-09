import { initDb, addMemoryRecord } from './db';
import { generateEmbedding } from './embedding';
import { retrieveSimilarMemories } from './retrieval';

export * from './db';
export * from './embedding';
export * from './retrieval';

/**
 * Add a text chunk to the local memory store.
 * @param text The text chunk to store.
 */
export async function addMemory(text: string): Promise<void> {
  initDb();
  const embedding = await generateEmbedding(text);
  addMemoryRecord(text, embedding);
}

/**
 * Search the local memory store for text chunks similar to the query.
 * @param query The text query to search for.
 * @param topK Number of relevant chunks to retrieve.
 * @returns An array of retrieval results.
 */
export async function searchMemory(query: string, topK: number = 5) {
  initDb();
  const queryEmbedding = await generateEmbedding(query);
  return retrieveSimilarMemories(queryEmbedding, topK);
}
