import fs from 'fs';
import path from 'path';
import { chunkMarkdown } from './chunker';
import { generateEmbedding } from './embedding';
import { loadIgnorePatterns, isIgnored } from './config';
import {
  getFileChecksum,
  setFileChecksum,
  deleteChunksForFile,
  clearAllChunks,
  insertChunk,
} from './db';

function djb2File(content: string): string {
  let hash = 5381;
  for (let i = 0; i < content.length; i++) {
    hash = ((hash << 5) + hash) ^ content.charCodeAt(i);
    hash = hash >>> 0;
  }
  return hash.toString(16);
}

export async function ingestFile(filePath: string, force = false): Promise<{ skipped: boolean; chunks: number }> {
  const absPath = path.resolve(filePath);
  const content = fs.readFileSync(absPath, 'utf-8');
  const fileChecksum = djb2File(content);

  const stored = getFileChecksum(absPath);
  if (!force && stored === fileChecksum) {
    console.log(`  skip  ${path.basename(absPath)} (unchanged)`);
    return { skipped: true, chunks: 0 };
  }

  deleteChunksForFile(absPath);
  const chunks = chunkMarkdown(content, path.basename(absPath));

  if (chunks.length === 0) {
    console.log(`  empty ${path.basename(absPath)}`);
    setFileChecksum(absPath, fileChecksum);
    return { skipped: false, chunks: 0 };
  }

  console.log(`  ingest ${path.basename(absPath)} → ${chunks.length} chunks`);
  for (const chunk of chunks) {
    chunk.file = absPath;
    const embedding = await generateEmbedding(chunk.content);
    insertChunk(chunk, embedding);
    process.stdout.write('.');
  }
  process.stdout.write('\n');

  setFileChecksum(absPath, fileChecksum);
  return { skipped: false, chunks: chunks.length };
}

function collectMdFiles(dir: string, root: string, patterns: RegExp[]): string[] {
  const results: string[] = [];
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return results;
  }
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    const fullPath = path.join(dir, entry.name);
    if (isIgnored(fullPath, root, patterns)) continue;
    if (entry.isDirectory()) {
      results.push(...collectMdFiles(fullPath, root, patterns));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      results.push(fullPath);
    }
  }
  return results;
}

export async function ingestDirectory(dirPath: string, force = false): Promise<{ files: number; chunks: number; skipped: number }> {
  const root = path.resolve(dirPath);
  const patterns = loadIgnorePatterns();
  const files = collectMdFiles(root, root, patterns);
  if (files.length === 0) {
    console.log('No .md files found.');
    return { files: 0, chunks: 0, skipped: 0 };
  }
  if (force) {
    console.log('Force mode: clearing existing chunks...');
    clearAllChunks();
  }
  console.log(`Found ${files.length} .md file(s)...`);
  let totalChunks = 0;
  let totalSkipped = 0;
  for (const file of files) {
    const result = await ingestFile(file, force);
    totalChunks += result.chunks;
    if (result.skipped) totalSkipped++;
  }
  return { files: files.length, chunks: totalChunks, skipped: totalSkipped };
}
