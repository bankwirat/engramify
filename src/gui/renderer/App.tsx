import { useState, useCallback, useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import 'highlight.js/styles/github.css'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { AppSidebar, type Tab } from '@/components/app-sidebar'
import { cn } from '@/lib/utils'
import { ipc, type HybridResult, type BM25Result } from '@/lib/ipc'

const _req = (window as any).require
const fs       = _req('fs')   as typeof import('fs')
const nodePath = _req('path') as typeof import('path')
const CWD: string = (window as any).process?.cwd?.() ?? ''

interface FilePanelData {
  file: string
  chunkContent: string | null
  breadcrumb: string
}

function splitAtChunk(full: string, chunk: string | null) {
  if (!chunk) return null

  // Work entirely on normalised string so positions are consistent
  const norm   = full.replace(/\r\n/g, '\n')
  const needle = chunk.trim().replace(/\r\n/g, '\n')

  const bodyStart = norm.indexOf(needle)
  if (bodyStart === -1) return null

  // Walk backwards through lines, skipping blank lines, to find the owning heading
  const beforeLines = norm.slice(0, bodyStart).split('\n')
  let headingIdx = -1
  for (let i = beforeLines.length - 1; i >= 0; i--) {
    if (beforeLines[i].trim() === '') continue       // skip blank lines
    if (/^#{1,6}\s/.test(beforeLines[i])) headingIdx = i
    break                                            // stop at first non-blank line
  }

  // Recompute start to the heading line's character position
  const start = headingIdx >= 0
    ? beforeLines.slice(0, headingIdx).join('\n').length + (headingIdx > 0 ? 1 : 0)
    : bodyStart

  const end = bodyStart + needle.length
  return {
    before: norm.slice(0, start),
    match:  norm.slice(start, end),
    after:  norm.slice(end),
  }
}

export default function App() {
  const [tab, setTab] = useState<Tab>('search')

  const [searchQuery, setSearchQuery]     = useState('')
  const [searchTopK, setSearchTopK]       = useState(5)
  const [searchResults, setSearchResults] = useState<HybridResult[] | null>(null)
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError]     = useState<string | null>(null)

  const [ingestPath, setIngestPath]       = useState(CWD)
  const [ingestForce, setIngestForce]     = useState(false)
  const [ingestLoading, setIngestLoading] = useState(false)
  const [ingestMsg, setIngestMsg]         = useState<{ ok: boolean; text: string } | null>(null)

  const [bm25Folder, setBm25Folder]       = useState(CWD)
  const [bm25Query, setBm25Query]         = useState('')
  const [bm25TopK, setBm25TopK]           = useState(5)
  const [bm25Results, setBm25Results]     = useState<BM25Result[] | null>(null)
  const [bm25Loading, setBm25Loading]     = useState(false)
  const [bm25Error, setBm25Error]         = useState<string | null>(null)

  const [addText, setAddText]             = useState('')
  const [addLoading, setAddLoading]       = useState(false)
  const [addMsg, setAddMsg]               = useState<{ ok: boolean; text: string } | null>(null)

  const [filePanel, setFilePanel]         = useState<FilePanelData | null>(null)
  const [fileContent, setFileContent]     = useState<string | null>(null)
  const [fileError, setFileError]         = useState<string | null>(null)
  const [activeCard, setActiveCard]       = useState<string | null>(null)
  const fpContentRef = useRef<HTMLDivElement>(null)

  const openPanel = useCallback((data: FilePanelData, cardKey: string) => {
    setActiveCard(cardKey)
    setFilePanel(data)
    setFileError(null)
    try {
      setFileContent(fs.readFileSync(data.file, 'utf-8'))
    } catch (e: any) {
      setFileContent(null)
      setFileError(`Cannot open:\n${data.file}\n\n${e.message}\n\nTry: engramify ingest . --force`)
    }
  }, [])

  const closePanel = useCallback(() => {
    setFilePanel(null); setFileContent(null); setFileError(null); setActiveCard(null)
  }, [])

  useEffect(() => {
    if (!fileContent || !filePanel?.chunkContent) return
    const t = setTimeout(() => {
      fpContentRef.current?.querySelector('.chunk-highlight')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 60)
    return () => clearTimeout(t)
  }, [fileContent, filePanel])

  const runSearch = useCallback(async () => {
    if (!searchQuery.trim()) return
    setSearchLoading(true); setSearchError(null); setSearchResults(null)
    const res = await ipc.hybridSearch(searchQuery.trim(), searchTopK)
    setSearchLoading(false)
    res.ok ? setSearchResults(res.results ?? []) : setSearchError(res.error ?? 'Unknown error')
  }, [searchQuery, searchTopK])

  const runIngest = useCallback(async () => {
    if (!ingestPath.trim()) return
    setIngestLoading(true); setIngestMsg(null)
    const res = await (ingestForce
      ? (window as any).require('electron').ipcRenderer.invoke('ingest-force', ingestPath.trim())
      : ipc.ingest(ingestPath.trim()))
    setIngestLoading(false)
    setIngestMsg({ ok: res.ok, text: res.ok ? 'Ingest complete.' : res.error ?? 'Failed.' })
  }, [ingestPath, ingestForce])

  const runBm25 = useCallback(async () => {
    if (!bm25Folder.trim() || !bm25Query.trim()) return
    setBm25Loading(true); setBm25Error(null); setBm25Results(null)
    const res = await ipc.bm25Search(bm25Folder.trim(), bm25Query.trim(), bm25TopK)
    setBm25Loading(false)
    res.ok ? setBm25Results(res.results ?? []) : setBm25Error(res.error ?? 'Unknown error')
  }, [bm25Folder, bm25Query, bm25TopK])

  const runAdd = useCallback(async () => {
    if (!addText.trim()) return
    setAddLoading(true); setAddMsg(null)
    const res = await ipc.addMemory(addText.trim())
    setAddLoading(false)
    if (res.ok) { setAddText(''); setAddMsg({ ok: true, text: 'Memory added.' }) }
    else setAddMsg({ ok: false, text: res.error ?? 'Failed.' })
  }, [addText])

  const cardClass = (key: string) => cn(
    'rounded-lg border bg-card p-3 cursor-pointer transition-colors select-none hover:border-primary/30',
    activeCard === key ? 'border-primary/50 bg-primary/5' : 'border-border',
  )

  const mdPlugins = {
    remarkPlugins: [remarkGfm],
    rehypePlugins: [rehypeHighlight],
  }
  const proseClass = [
    'prose prose-sm max-w-none',
    'prose-headings:text-foreground prose-headings:font-semibold',
    'prose-p:text-foreground prose-li:text-foreground',
    'prose-a:text-primary prose-strong:text-foreground',
    'prose-code:text-foreground prose-code:before:content-none prose-code:after:content-none',
    'prose-ul:list-disc prose-ol:list-decimal prose-ul:pl-5 prose-ol:pl-5',
    'prose-hr:border-border',
  ].join(' ')

  const Md = ({ children }: { children: string }) => (
    <div className={proseClass}>
      <ReactMarkdown {...mdPlugins}>{children}</ReactMarkdown>
    </div>
  )

  const renderFileContent = () => {
    if (fileError) return <pre className="text-destructive text-xs whitespace-pre-wrap leading-relaxed">{fileError}</pre>
    if (!fileContent) return null
    const parts = splitAtChunk(fileContent, filePanel?.chunkContent ?? null)
    if (parts) {
      return (
        <div>
          <Md>{parts.before}</Md>
          <div className="chunk-highlight bg-primary/10 border-l-2 border-primary pl-2 rounded-r my-2">
            <Md>{parts.match}</Md>
          </div>
          <Md>{parts.after}</Md>
        </div>
      )
    }
    return <Md>{fileContent}</Md>
  }

  return (
    <SidebarProvider>
      <AppSidebar activeTab={tab} onTabChange={setTab} />

      <SidebarInset className="overflow-hidden">
        {/* Topbar */}
        <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="h-4" />
          <span className="text-sm font-medium text-muted-foreground">
            {{ search: 'Search', ingest: 'Ingest', bm25: 'BM25', add: 'Add Memory' }[tab]}
          </span>
        </header>

        {/* Body: content + file panel */}
        <div className="flex flex-1 overflow-hidden">

          {/* Main panels */}
          <div className="flex-[1] flex flex-col overflow-hidden min-w-0">

            {/* Search */}
            <div className={cn('flex-1 flex flex-col overflow-hidden', tab !== 'search' && 'hidden')}>
              <div className="p-4 border-b flex-shrink-0">
                <div className="flex gap-2 items-end">
                  <div className="flex-1 space-y-1.5">
                    <Label>Query</Label>
                    <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && runSearch()} placeholder="ask anything about your notes…" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Top K</Label>
                    <Input type="number" value={searchTopK} onChange={e => setSearchTopK(+e.target.value)} className="w-16" min={1} max={50} />
                  </div>
                  <Button onClick={runSearch} disabled={searchLoading}>{searchLoading ? 'Searching…' : 'Search'}</Button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {searchError && <p className="text-xs text-destructive text-center py-6">{searchError}</p>}
                {searchResults?.length === 0 && <p className="text-xs text-muted-foreground text-center py-6">No results. Try running Ingest first.</p>}
                {searchResults?.map((r, i) => {
                  const key = `s${i}:${r.file}`
                  return (
                    <div key={key} className={cardClass(key)} onClick={() => openPanel({ file: r.file, chunkContent: r.content, breadcrumb: r.path }, key)}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-primary font-mono">#{i + 1}</span>
                        <span className="text-xs text-muted-foreground/60 font-mono">{r.score.toFixed(4)}</span>
                      </div>
                      <p className="text-xs text-muted-foreground/50 font-mono truncate mb-1">{r.path}</p>
                      <p className="text-sm font-semibold mb-1 truncate">{r.heading}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{r.content.slice(0, 240)}{r.content.length > 240 ? '…' : ''}</p>
                    </div>
                  )
                })}
                {!searchResults && !searchLoading && !searchError && (
                  <p className="text-xs text-muted-foreground text-center py-6">Hybrid search (BM25 + vector) over ingested chunks.</p>
                )}
              </div>
            </div>

            {/* Ingest */}
            <div className={cn('flex-1 flex flex-col overflow-hidden', tab !== 'ingest' && 'hidden')}>
              <div className="p-4 border-b flex-shrink-0 space-y-3">
                <div className="flex gap-2 items-end">
                  <div className="flex-1 space-y-1.5">
                    <Label>File or folder</Label>
                    <Input value={ingestPath} onChange={e => setIngestPath(e.target.value)} placeholder="/path/to/notes" />
                    <p className="text-xs text-muted-foreground/50">Recursively ingests all .md files. Skips unchanged files.</p>
                  </div>
                  <Button onClick={runIngest} disabled={ingestLoading}>{ingestLoading ? 'Ingesting…' : 'Ingest'}</Button>
                </div>
                <label className="flex items-center gap-2 cursor-pointer w-fit">
                  <input type="checkbox" checked={ingestForce} onChange={e => setIngestForce(e.target.checked)} className="accent-primary" />
                  <span className="text-xs text-muted-foreground">Force re-ingest all files</span>
                </label>
              </div>
              <div className="flex-1 p-4">
                {ingestMsg && <p className={cn('text-xs text-center py-6', ingestMsg.ok ? 'text-green-600' : 'text-destructive')}>{ingestMsg.text}</p>}
                {!ingestMsg && !ingestLoading && <p className="text-xs text-muted-foreground text-center py-6">Point to a folder of .md files to build the brain.</p>}
              </div>
            </div>

            {/* BM25 */}
            <div className={cn('flex-1 flex flex-col overflow-hidden', tab !== 'bm25' && 'hidden')}>
              <div className="p-4 border-b flex-shrink-0">
                <div className="flex gap-2 items-end">
                  <div className="flex-1 space-y-1.5">
                    <Label>Folder</Label>
                    <Input value={bm25Folder} onChange={e => setBm25Folder(e.target.value)} placeholder="./" />
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <Label>Query</Label>
                    <Input value={bm25Query} onChange={e => setBm25Query(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && runBm25()} placeholder="keyword search…" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Top K</Label>
                    <Input type="number" value={bm25TopK} onChange={e => setBm25TopK(+e.target.value)} className="w-16" min={1} max={50} />
                  </div>
                  <Button onClick={runBm25} disabled={bm25Loading}>{bm25Loading ? 'Searching…' : 'Search'}</Button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {bm25Error && <p className="text-xs text-destructive text-center py-6">{bm25Error}</p>}
                {bm25Results?.length === 0 && <p className="text-xs text-muted-foreground text-center py-6">No results.</p>}
                {bm25Results?.map((r, i) => {
                  const rel = nodePath.relative(bm25Folder, r.file) || r.file
                  const key = `b${i}:${r.file}`
                  return (
                    <div key={key} className={cardClass(key)} onClick={() => openPanel({ file: r.file, chunkContent: r.snippet, breadcrumb: rel }, key)}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-primary font-mono">#{i + 1}</span>
                        <span className="text-xs text-muted-foreground/60 font-mono">{r.score.toFixed(4)}</span>
                      </div>
                      <p className="text-xs text-muted-foreground/50 font-mono truncate mb-1">{rel}</p>
                      <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">{r.snippet}</p>
                    </div>
                  )
                })}
                {!bm25Results && !bm25Loading && !bm25Error && (
                  <p className="text-xs text-muted-foreground text-center py-6">BM25 keyword search over raw files on disk.</p>
                )}
              </div>
            </div>

            {/* Add Memory */}
            <div className={cn('flex-1 flex flex-col overflow-hidden', tab !== 'add' && 'hidden')}>
              <div className="p-4 space-y-3">
                <div className="space-y-1.5">
                  <Label>Text to remember</Label>
                  <Textarea value={addText} onChange={e => setAddText(e.target.value)} placeholder="Paste any text, note, or fact…" />
                </div>
                <Button onClick={runAdd} disabled={addLoading}>{addLoading ? 'Adding…' : 'Add to Memory'}</Button>
                {addMsg && <p className={cn('text-xs', addMsg.ok ? 'text-green-600' : 'text-destructive')}>{addMsg.text}</p>}
              </div>
            </div>

          </div>

          {/* File panel */}
          <div className="flex-[4] flex flex-col border-l bg-sidebar/40 overflow-hidden">
            {filePanel ? (
              <>
                <div className="flex items-center gap-2 px-3 h-12 border-b flex-shrink-0">
                  <span className="text-sm font-medium flex-1 truncate">{nodePath.basename(filePanel.file)}</span>
                  <Button variant="ghost" size="icon" onClick={closePanel}><X className="h-3.5 w-3.5" /></Button>
                </div>
                <div className="px-3 py-1.5 border-b flex-shrink-0">
                  <p className="text-xs text-muted-foreground/40 font-mono truncate">{filePanel.breadcrumb}</p>
                </div>
                <div ref={fpContentRef} className="flex-1 overflow-y-auto p-3">
                  {renderFileContent()}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-xs text-muted-foreground/40 select-none">Select a result to preview</p>
              </div>
            )}
          </div>

        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
