let extractor: any = null;

export async function initEmbeddingModel() {
  if (!extractor) {
    const { pipeline, env } = await eval('import("@xenova/transformers")');
    env.allowLocalModels = false;
    env.useBrowserCache = false;
    extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  }
}

export async function generateEmbedding(text: string): Promise<number[]> {
  await initEmbeddingModel();
  const output = await extractor(text, { pooling: 'mean', normalize: true });
  return Array.from(output.data);
}
