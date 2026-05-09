import Database from 'better-sqlite3';
import path from 'path';
import * as sqliteVec from 'sqlite-vec';
import { getEngramifyDir } from './config';
import type { Chunk } from './chunker';

export interface MemoryRow {
  id: number;
  text: string;
  embedding: string;
  timestamp: string;
}

export interface ChunkRow {
  id: number;
  file: string;
  path: string;
  heading: string;
  level: number;
  content: string;
  checksum: string;
}

let _db: Database.Database | null = null;

function getDb(): Database.Database {
  if (!_db) {
    const dbPath = path.join(getEngramifyDir(), 'engramify.sqlite');
    _db = new Database(dbPath);
    sqliteVec.load(_db);
  }
  return _db;
}

export function initDb() {
  const db = getDb();

  // Legacy memories table
  db.exec(`
    CREATE TABLE IF NOT EXISTS memories (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      text      TEXT NOT NULL,
      embedding TEXT NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Chunks table
  db.exec(`
    CREATE TABLE IF NOT EXISTS chunks (
      id       INTEGER PRIMARY KEY AUTOINCREMENT,
      file     TEXT NOT NULL,
      path     TEXT NOT NULL,
      heading  TEXT NOT NULL,
      level    INTEGER NOT NULL,
      content  TEXT NOT NULL,
      checksum TEXT NOT NULL
    )
  `);

  // File-level checksums for change detection
  db.exec(`
    CREATE TABLE IF NOT EXISTS files (
      path     TEXT PRIMARY KEY,
      checksum TEXT NOT NULL
    )
  `);

  // FTS5 for BM25
  db.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS chunks_fts USING fts5(
      content,
      path,
      content='chunks',
      content_rowid='id',
      tokenize='porter unicode61'
    )
  `);

  db.exec(`
    CREATE TRIGGER IF NOT EXISTS chunks_ai AFTER INSERT ON chunks BEGIN
      INSERT INTO chunks_fts(rowid, content, path) VALUES (new.id, new.content, new.path);
    END
  `);

  db.exec(`
    CREATE TRIGGER IF NOT EXISTS chunks_ad AFTER DELETE ON chunks BEGIN
      INSERT INTO chunks_fts(chunks_fts, rowid, content, path)
        VALUES ('delete', old.id, old.content, old.path);
    END
  `);

  // Vector table — 384 dims (all-MiniLM-L6-v2)
  db.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS vec_chunks USING vec0(
      id INTEGER PRIMARY KEY,
      embedding FLOAT[384]
    )
  `);
}

// ── Legacy memory functions ──────────────────────────────────────────────────

export function addMemoryRecord(text: string, embedding: number[]) {
  getDb().prepare('INSERT INTO memories (text, embedding) VALUES (?, ?)').run(text, JSON.stringify(embedding));
}

export function getAllMemories(): MemoryRow[] {
  return getDb().prepare('SELECT * FROM memories').all() as MemoryRow[];
}

// ── Chunk functions ──────────────────────────────────────────────────────────

export function getFileChecksum(filePath: string): string | null {
  const row = getDb().prepare('SELECT checksum FROM files WHERE path = ?').get(filePath) as { checksum: string } | undefined;
  return row?.checksum ?? null;
}

export function setFileChecksum(filePath: string, checksum: string) {
  getDb().prepare('INSERT OR REPLACE INTO files (path, checksum) VALUES (?, ?)').run(filePath, checksum);
}

export function deleteChunksForFile(filePath: string) {
  getDb().prepare('DELETE FROM chunks WHERE file = ?').run(filePath);
  getDb().prepare('DELETE FROM files WHERE path = ?').run(filePath);
}

export function clearAllChunks() {
  const db = getDb();
  db.exec('DELETE FROM vec_chunks');
  db.exec('DELETE FROM chunks');
  db.exec('DELETE FROM files');
  db.exec("INSERT INTO chunks_fts(chunks_fts) VALUES ('rebuild')");
}

export function insertChunk(chunk: Chunk, embedding: number[]): number {
  const db = getDb();
  const insert = db.transaction(() => {
    db.prepare(
      'INSERT INTO chunks (file, path, heading, level, content, checksum) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(chunk.file, chunk.path, chunk.heading, chunk.level, chunk.content, chunk.checksum);
    db.prepare(
      'INSERT INTO vec_chunks (id, embedding) VALUES (last_insert_rowid(), ?)'
    ).run(JSON.stringify(embedding));
    return Number((db.prepare('SELECT last_insert_rowid() AS id').get() as any).id);
  });
  return insert();
}

export function getChunksByIds(ids: number[]): ChunkRow[] {
  if (ids.length === 0) return [];
  const placeholders = ids.map(() => '?').join(',');
  const rows = getDb().prepare(
    `SELECT * FROM chunks WHERE id IN (${placeholders})`
  ).all(...ids) as ChunkRow[];

  // Return in the order of the input ids
  const byId = new Map(rows.map(r => [r.id, r]));
  return ids.map(id => byId.get(id)).filter(Boolean) as ChunkRow[];
}

export function bm25ChunkSearch(query: string, limit: number): Array<{ id: number; score: number }> {
  try {
    return getDb().prepare(`
      SELECT chunks.id, bm25(chunks_fts) AS score
      FROM chunks_fts
      JOIN chunks ON chunks.id = chunks_fts.rowid
      WHERE chunks_fts MATCH ?
      ORDER BY score
      LIMIT ?
    `).all(query, limit) as Array<{ id: number; score: number }>;
  } catch {
    return [];
  }
}

export function vecChunkSearch(embedding: number[], limit: number): Array<{ id: number; distance: number }> {
  return getDb().prepare(`
    SELECT id, distance
    FROM vec_chunks
    WHERE embedding MATCH ?
      AND k = ?
    ORDER BY distance
  `).all(JSON.stringify(embedding), limit) as Array<{ id: number; distance: number }>;
}
