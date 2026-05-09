FILE src/bm25.ts
I BM25Result@5
F tokenize@15
F collectFiles@20
F readText@45
F extractSnippet@55
F bm25Search@72 -> tokenize, collectFiles, readText, extractSnippet

FILE src/chunker.ts
I Chunk@1
F djb2@10
F chunkMarkdown@19 -> djb2, flush
F flush@29 -> djb2

FILE src/cli.ts
F handleError@57

FILE src/config.ts
F getEngramifyDir@6
F initEngramifyDir@14
F patternToRegex@41
F loadIgnorePatterns@53 -> getEngramifyDir
F isIgnored@67

FILE src/db.ts
I MemoryRow@7
I ChunkRow@14
F getDb@26
F initDb@35 -> getDb
F addMemoryRecord@104 -> getDb
F getAllMemories@108 -> getDb
F getFileChecksum@114 -> getDb
F setFileChecksum@119 -> getDb
F deleteChunksForFile@123 -> getDb
F clearAllChunks@128 -> getDb
F insertChunk@136 -> getDb
F getChunksByIds@150 -> getDb
F bm25ChunkSearch@162 -> getDb
F vecChunkSearch@177 -> getDb

FILE src/embedding.ts
F initEmbeddingModel@3
F generateEmbedding@12 -> initEmbeddingModel

FILE src/gui/main.ts
F runCli@13
F createWindow@27

FILE src/gui/renderer/App.tsx
I FilePanelData@22
F splitAtChunk@28
F App@60 -> splitAtChunk, cardClass, renderFileContent
F cardClass@150
F Md@169
F renderFileContent@175 -> splitAtChunk

FILE src/gui/renderer/components/app-sidebar.tsx
I AppSidebarProps@16
F AppSidebar@21

FILE src/gui/renderer/components/ui/button.tsx
I ButtonProps@24

FILE src/gui/renderer/components/ui/input.tsx

FILE src/gui/renderer/components/ui/label.tsx

FILE src/gui/renderer/components/ui/separator.tsx

FILE src/gui/renderer/components/ui/sheet.tsx
F SheetHeader@51

FILE src/gui/renderer/components/ui/sidebar.tsx
F useSidebar@36
F handleKeyDown@70

FILE src/gui/renderer/components/ui/skeleton.tsx
F Skeleton@4

FILE src/gui/renderer/components/ui/textarea.tsx

FILE src/gui/renderer/components/ui/tooltip.tsx

FILE src/gui/renderer/hooks/use-mobile.ts
F useIsMobile@5
F onChange@9

FILE src/gui/renderer/lib/ipc.ts
I HybridResult@4
I BM25Result@12

FILE src/gui/renderer/lib/utils.ts
F cn@4

FILE src/gui/renderer/main.tsx

FILE src/index.ts
F addMemory@13
F searchMemory@25

FILE src/ingest.ts
F djb2File@14
F ingestFile@23 -> djb2File
F collectMdFiles@56
F ingestDirectory@77 -> collectMdFiles, ingestFile

FILE src/retrieval.ts
F cosineSimilarity@5
I RetrievalResult@16
F retrieveSimilarMemories@22 -> cosineSimilarity
I HybridResult@35
F rrf@43
F hybridSearch@60 -> rrf

FILE tailwind.config.ts

FILE vite.config.ts