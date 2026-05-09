import fs from 'fs';
import path from 'path';
import { loadIgnorePatterns, isIgnored } from './config';

export interface BM25Result {
  file: string;
  score: number;
  snippet: string;
}

const K1 = 1.5;
const B = 0.75;
const MAX_FILE_BYTES = 512 * 1024; // 512 KB

function tokenize(text: string): string[] {
  return text.toLowerCase().split(/\W+/).filter(t => t.length > 1);
}


function collectFiles(dir: string, root: string, patterns: RegExp[]): string[] {
  const results: string[] = [];
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return results;
  }
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue; // skip hidden dirs/files
    const fullPath = path.join(dir, entry.name);
    if (isIgnored(fullPath, root, patterns)) continue;
    if (entry.isDirectory()) {
      results.push(...collectFiles(fullPath, root, patterns));
    } else if (entry.isFile()) {
      try {
        if (fs.statSync(fullPath).size <= MAX_FILE_BYTES) results.push(fullPath);
      } catch {
        // skip unreadable
      }
    }
  }
  return results;
}

function readText(filePath: string): string | null {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    if (content.includes('\0')) return null;
    return content;
  } catch {
    return null;
  }
}

function extractSnippet(text: string, queryTerms: string[], maxLength = 200): string {
  const lower = text.toLowerCase();
  let bestPos = 0;
  let bestCount = 0;

  for (let i = 0; i < lower.length; i += 50) {
    const window = lower.slice(i, i + maxLength);
    const count = queryTerms.reduce((n, t) => n + (window.includes(t) ? 1 : 0), 0);
    if (count > bestCount) {
      bestCount = count;
      bestPos = i;
    }
  }

  return text.slice(bestPos, bestPos + maxLength).replace(/\s+/g, ' ').trim();
}

export function bm25Search(folder: string, query: string, topK = 5): BM25Result[] {
  const queryTerms = tokenize(query);
  if (queryTerms.length === 0) return [];

  const patterns = loadIgnorePatterns();
  const files = collectFiles(folder, folder, patterns);
  const docs: { file: string; content: string; tokens: string[] }[] = [];

  for (const file of files) {
    const content = readText(file);
    if (content === null) continue;
    docs.push({ file, content, tokens: tokenize(content) });
  }

  if (docs.length === 0) return [];

  const avgDl = docs.reduce((sum, d) => sum + d.tokens.length, 0) / docs.length;
  const N = docs.length;

  const df: Record<string, number> = {};
  for (const term of queryTerms) {
    df[term] = docs.filter(d => d.tokens.includes(term)).length;
  }

  const scored = docs.map(doc => {
    const dl = doc.tokens.length;
    const tf: Record<string, number> = {};
    for (const token of doc.tokens) tf[token] = (tf[token] ?? 0) + 1;

    let score = 0;
    for (const term of queryTerms) {
      const termFreq = tf[term] ?? 0;
      if (termFreq === 0) continue;
      const idf = Math.log((N - df[term] + 0.5) / (df[term] + 0.5) + 1);
      const tfNorm = (termFreq * (K1 + 1)) / (termFreq + K1 * (1 - B + B * (dl / avgDl)));
      score += idf * tfNorm;
    }

    return { file: doc.file, score, snippet: extractSnippet(doc.content, queryTerms) };
  });

  return scored
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}
