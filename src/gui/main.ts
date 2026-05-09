/* eslint-disable @typescript-eslint/no-var-requires */
// electron is lazily installed at runtime — not a compile-time dependency
const { app, BrowserWindow, ipcMain } = require('electron');
import path from 'path';
import { execFile } from 'child_process';

// Passed by cli.ts --gui so the Electron process uses the exact same Node binary
// and CLI entry point that launched it — no native module ABI mismatch possible.
const NODE_BIN = process.env.ENGRAMIFY_NODE || process.execPath;
const CLI_PATH = process.env.ENGRAMIFY_CLI  || path.join(__dirname, '..', 'cli.js');
const CWD      = process.env.ENGRAMIFY_CWD  || process.cwd();

function runCli(args: string[]): Promise<{ ok: boolean; [key: string]: any }> {
  return new Promise((resolve) => {
    execFile(NODE_BIN, [CLI_PATH, ...args, '--json'], { cwd: CWD }, (err, stdout, stderr) => {
      const raw = stdout.trim();
      try {
        const parsed = JSON.parse(raw);
        resolve(parsed);
      } catch {
        resolve({ ok: false, error: stderr.trim() || (err ? err.message : 'Unknown error') });
      }
    });
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 900,
    height: 660,
    title: 'Engramify',
    backgroundColor: '#ffffff',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());

ipcMain.handle('hybrid-search', async (_e: any, query: string, topK: number) => {
  return runCli(['search', query, '--top-k', String(topK)]);
});

ipcMain.handle('ingest', async (_e: any, target: string) => {
  return runCli(['ingest', target]);
});

ipcMain.handle('ingest-force', async (_e: any, target: string) => {
  return runCli(['ingest', target, '--force']);
});

ipcMain.handle('bm25-search', async (_e: any, folder: string, query: string, topK: number) => {
  return runCli(['bm25', folder, query, '--top-k', String(topK)]);
});

ipcMain.handle('add-memory', async (_e: any, text: string) => {
  // add command writes to memory (no --json yet, but ok/error still works)
  return new Promise((resolve) => {
    execFile(NODE_BIN, [CLI_PATH, 'add', text], { cwd: CWD }, (err, _stdout, stderr) => {
      if (err) {
        resolve({ ok: false, error: stderr.trim() || err.message });
      } else {
        resolve({ ok: true });
      }
    });
  });
});
