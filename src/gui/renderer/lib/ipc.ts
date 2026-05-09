// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { ipcRenderer } = (window as any).require('electron')

export interface HybridResult {
  file: string
  path: string
  heading: string
  content: string
  score: number
}

export interface BM25Result {
  file: string
  score: number
  snippet: string
}

export const ipc = {
  hybridSearch: (query: string, topK: number): Promise<{ ok: boolean; results?: HybridResult[]; error?: string }> =>
    ipcRenderer.invoke('hybrid-search', query, topK),

  ingest: (target: string): Promise<{ ok: boolean; error?: string }> =>
    ipcRenderer.invoke('ingest', target),

  bm25Search: (folder: string, query: string, topK: number): Promise<{ ok: boolean; results?: BM25Result[]; error?: string }> =>
    ipcRenderer.invoke('bm25-search', folder, query, topK),

  addMemory: (text: string): Promise<{ ok: boolean; error?: string }> =>
    ipcRenderer.invoke('add-memory', text),
}
