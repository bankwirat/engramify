import path from 'path';
import fs from 'fs';

const DIR_NAME = '.engramify';

export function getEngramifyDir(): string {
  const dir = path.join(process.cwd(), DIR_NAME);
  if (!fs.existsSync(dir)) {
    throw new Error(`Not an engramify repository. Run 'engramify init' to initialize one.`);
  }
  return dir;
}

export function initEngramifyDir(): { dir: string; alreadyExists: boolean } {
  const dir = path.join(process.cwd(), DIR_NAME);
  if (fs.existsSync(dir)) {
    return { dir, alreadyExists: true };
  }
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'ignore'), [
    '# engramify ignore rules',
    '# Files and folders to exclude from BM25 search',
    '',
    'node_modules/',
    'dist/',
    '*.png',
    '*.jpg',
    '*.jpeg',
    '*.gif',
    '*.webp',
    '*.svg',
    '*.pdf',
    '*.sqlite',
    '*.db',
  ].join('\n') + '\n');
  return { dir, alreadyExists: false };
}

// ── Ignore patterns (shared by ingest + bm25) ───────────────────────────────

function patternToRegex(pattern: string): RegExp {
  const isDir = pattern.endsWith('/');
  const p = isDir ? pattern.slice(0, -1) : pattern;
  const escaped = p
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '\x00')
    .replace(/\*/g, '[^/]*')
    .replace(/\?/g, '[^/]')
    .replace(/\x00/g, '.*');
  return new RegExp(`(^|/)${escaped}(/|$)`);
}

export function loadIgnorePatterns(): RegExp[] {
  const ignorePath = path.join(getEngramifyDir(), 'ignore');
  try {
    const content = fs.readFileSync(ignorePath, 'utf-8');
    return content
      .split('\n')
      .map(l => l.trim())
      .filter(l => l && !l.startsWith('#'))
      .map(patternToRegex);
  } catch {
    return [];
  }
}

export function isIgnored(filePath: string, root: string, patterns: RegExp[]): boolean {
  const rel = path.relative(root, filePath);
  return patterns.some(p => p.test(rel));
}
