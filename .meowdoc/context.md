## Meowdoc Project Structure

.
├─ src/
│   ├─ gui/
│   │   ├─ renderer/
│   │   │   ├─ components/
│   │   │   │   ├─ ui/
│   │   │   │   │   ├─ button.tsx
│   │   │   │   │   │   └─ I: ButtonProps L24
│   │   │   │   │   ├─ input.tsx
│   │   │   │   │   ├─ label.tsx
│   │   │   │   │   ├─ separator.tsx
│   │   │   │   │   ├─ sheet.tsx
│   │   │   │   │   │   └─ F: SheetHeader L51
│   │   │   │   │   ├─ sidebar.tsx
│   │   │   │   │   │   ├─ F: useSidebar L36
│   │   │   │   │   │   └─ F: handleKeyDown L70
│   │   │   │   │   ├─ skeleton.tsx
│   │   │   │   │   │   └─ F: Skeleton L4
│   │   │   │   │   ├─ textarea.tsx
│   │   │   │   │   └─ tooltip.tsx
│   │   │   │   └─ app-sidebar.tsx
│   │   │   │       ├─ I: AppSidebarProps L16
│   │   │   │       └─ F: AppSidebar L21
│   │   │   ├─ hooks/
│   │   │   │   └─ use-mobile.ts
│   │   │   │       └─ F: useIsMobile L5
│   │   │   │           └─ F: onChange L9
│   │   │   ├─ lib/
│   │   │   │   ├─ ipc.ts
│   │   │   │   │   ├─ I: HybridResult L4
│   │   │   │   │   └─ I: BM25Result L12
│   │   │   │   └─ utils.ts
│   │   │   │       └─ F: cn L4
│   │   │   ├─ App.tsx
│   │   │   │   ├─ I: FilePanelData L22
│   │   │   │   ├─ F: splitAtChunk L28
│   │   │   │   └─ F: App L60
│   │   │   │       ├─ F: cardClass L150
│   │   │   │       ├─ F: Md L169
│   │   │   │       └─ F: renderFileContent L175
│   │   │   └─ main.tsx
│   │   └─ main.ts
│   │       ├─ F: runCli L13
│   │       └─ F: createWindow L27
│   ├─ bm25.ts
│   │   ├─ I: BM25Result L5
│   │   ├─ F: tokenize L15
│   │   ├─ F: collectFiles L20
│   │   ├─ F: readText L45
│   │   ├─ F: extractSnippet L55
│   │   └─ F: bm25Search L72
│   ├─ chunker.ts
│   │   ├─ I: Chunk L1
│   │   ├─ F: djb2 L10
│   │   └─ F: chunkMarkdown L19
│   │       └─ F: flush L29
│   ├─ cli.ts
│   │   └─ F: handleError L57
│   ├─ config.ts
│   │   ├─ F: getEngramifyDir L6
│   │   ├─ F: initEngramifyDir L14
│   │   ├─ F: patternToRegex L41
│   │   ├─ F: loadIgnorePatterns L53
│   │   └─ F: isIgnored L67
│   ├─ db.ts
│   │   ├─ I: MemoryRow L7
│   │   ├─ I: ChunkRow L14
│   │   ├─ F: getDb L26
│   │   ├─ F: initDb L35
│   │   ├─ F: addMemoryRecord L104
│   │   ├─ F: getAllMemories L108
│   │   ├─ F: getFileChecksum L114
│   │   ├─ F: setFileChecksum L119
│   │   ├─ F: deleteChunksForFile L123
│   │   ├─ F: clearAllChunks L128
│   │   ├─ F: insertChunk L136
│   │   ├─ F: getChunksByIds L150
│   │   ├─ F: bm25ChunkSearch L162
│   │   └─ F: vecChunkSearch L177
│   ├─ embedding.ts
│   │   ├─ F: initEmbeddingModel L3
│   │   └─ F: generateEmbedding L12
│   ├─ index.ts
│   │   ├─ F: addMemory L13
│   │   └─ F: searchMemory L25
│   ├─ ingest.ts
│   │   ├─ F: djb2File L14
│   │   ├─ F: ingestFile L23
│   │   ├─ F: collectMdFiles L56
│   │   └─ F: ingestDirectory L77
│   └─ retrieval.ts
│       ├─ F: cosineSimilarity L5
│       ├─ I: RetrievalResult L16
│       ├─ F: retrieveSimilarMemories L22
│       ├─ I: HybridResult L35
│       ├─ F: rrf L43
│       └─ F: hybridSearch L60
├─ tailwind.config.ts
└─ vite.config.ts
