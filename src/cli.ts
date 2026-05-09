#!/usr/bin/env node
import { Command } from 'commander';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { spawnSync, spawn } from 'child_process';

// Handle --gui before commander parses, so it doesn't error on unknown option
if (process.argv.includes('--gui')) {
  const REQUIRED_ELECTRON = '33';
  const engramifyHome = path.join(os.homedir(), '.engramify');
  const electronBin   = path.join(engramifyHome, 'node_modules', '.bin', 'electron');
  const mainScript    = path.join(__dirname, 'gui', 'main.js');

  fs.mkdirSync(engramifyHome, { recursive: true });

  // Check if installed Electron is the required major version
  let needsInstall = !fs.existsSync(electronBin);
  if (!needsInstall) {
    const installed = spawnSync(electronBin, ['--version'], { encoding: 'utf8' }).stdout.trim().replace('v', '');
    if (!installed.startsWith(REQUIRED_ELECTRON + '.')) {
      console.log(`Electron ${installed} installed but requires v${REQUIRED_ELECTRON}. Reinstalling...`);
      needsInstall = true;
    }
  }

  if (needsInstall) {
    console.log(`Installing Electron ${REQUIRED_ELECTRON}... (one-time, ~200MB)`);
    const r = spawnSync('npm', ['install', `electron@${REQUIRED_ELECTRON}`, '--prefix', engramifyHome], {
      stdio: 'inherit', shell: true,
    });
    if (r.status !== 0) {
      console.error('Failed to install Electron.');
      process.exit(1);
    }
  }

  console.log('Launching Engramify GUI...');
  spawn(electronBin, [mainScript], {
    stdio: 'inherit',
    env: {
      ...process.env,
      ENGRAMIFY_NODE: process.execPath,
      ENGRAMIFY_CLI:  path.join(__dirname, 'cli.js'),
      ENGRAMIFY_CWD:  process.cwd(),
    },
  });
  process.exit(0);
}
import { initDb, addMemoryRecord } from './db';
import { generateEmbedding } from './embedding';
import { retrieveSimilarMemories, hybridSearch } from './retrieval';
import { bm25Search } from './bm25';
import { initEngramifyDir } from './config';
import { ingestFile, ingestDirectory } from './ingest';

function handleError(error: unknown): never {
  const msg = error instanceof Error ? error.message : String(error);
  console.error(msg);
  process.exit(1);
}

const program = new Command();

program
  .name('engramify')
  .description('A lightweight, local semantic memory engine and vector retrieval CLI for autonomous AI agents.')
  .version('1.0.0');

program
  .command('init')
  .description('Initialize an engramify repository in the current directory')
  .action(() => {
    try {
      const { dir, alreadyExists } = initEngramifyDir();
      if (alreadyExists) {
        console.log(`Already initialized at ${dir}`);
      } else {
        console.log(`Initialized engramify repository at ${dir}`);
        console.log(`Edit ${dir}/ignore to exclude files from BM25 search.`);
      }
    } catch (error) {
      handleError(error);
    }
  });

program
  .command('add')
  .description('Add a new text chunk to memory')
  .argument('<text>', 'The text to remember')
  .action(async (text: string) => {
    try {
      console.log('Initializing database...');
      initDb();
      console.log('Generating embedding (may take a moment on first run to download model)...');
      const embedding = await generateEmbedding(text);
      addMemoryRecord(text, embedding);
      console.log('Memory successfully added!');
    } catch (error) {
      handleError(error);
    }
  });

program
  .command('ingest')
  .description('Ingest a .md file or directory into the engramify brain')
  .argument('<path>', 'A .md file or a directory of .md files')
  .option('-f, --force', 'Re-ingest all files, ignoring cached checksums')
  .option('--json', 'Output result as JSON')
  .action(async (target: string, options) => {
    try {
      initDb();
      const stat = fs.statSync(path.resolve(target));
      let result: object;
      if (stat.isDirectory()) {
        result = await ingestDirectory(target, options.force);
      } else {
        result = await ingestFile(target, options.force);
      }
      if (options.json) {
        process.stdout.write(JSON.stringify({ ok: true, ...result }) + '\n');
      } else {
        console.log('Done.');
      }
    } catch (error) {
      if (options.json) {
        process.stdout.write(JSON.stringify({ ok: false, error: String(error instanceof Error ? error.message : error) }) + '\n');
      } else {
        handleError(error);
      }
    }
  });

program
  .command('search')
  .description('Hybrid search (BM25 + vector) over ingested chunks')
  .argument('<query>', 'The search query')
  .option('-k, --top-k <number>', 'Number of results to return', '5')
  .option('--json', 'Output result as JSON')
  .action(async (query: string, options) => {
    try {
      initDb();
      const topK = parseInt(options.topK, 10);
      const queryEmbedding = await generateEmbedding(query);
      const results = hybridSearch(queryEmbedding, query, topK);
      if (options.json) {
        process.stdout.write(JSON.stringify({ ok: true, results }) + '\n');
        return;
      }
      console.log('\n--- Search Results ---');
      if (results.length === 0) {
        console.log('No results found. Try running: engramify ingest <folder>');
      } else {
        results.forEach((res, i) => {
          console.log(`\nResult ${i + 1} (Score: ${res.score.toFixed(4)})`);
          console.log(`Path:    ${res.path} > ${res.heading}`);
          console.log(`Content: ${res.content.slice(0, 200).replace(/\n/g, ' ')}...`);
        });
      }
      console.log('----------------------\n');
    } catch (error) {
      if (options.json) {
        process.stdout.write(JSON.stringify({ ok: false, error: String(error instanceof Error ? error.message : error) }) + '\n');
      } else {
        handleError(error);
      }
    }
  });

program
  .command('bm25')
  .description('BM25 keyword search over files in a folder and its subdirectories')
  .argument('<folder>', 'The folder to search in')
  .argument('<query>', 'The search query')
  .option('-k, --top-k <number>', 'Number of results to return', '5')
  .option('--json', 'Output result as JSON')
  .action((folder: string, query: string, options) => {
    try {
      const resolvedFolder = path.resolve(folder);
      const topK = parseInt(options.topK, 10);
      const results = bm25Search(resolvedFolder, query, topK);
      if (options.json) {
        process.stdout.write(JSON.stringify({ ok: true, results }) + '\n');
        return;
      }
      console.log('\n--- BM25 Search Results ---');
      if (results.length === 0) {
        console.log('No results found.');
      } else {
        results.forEach((res, index) => {
          const relativePath = path.relative(process.cwd(), res.file);
          console.log(`\nResult ${index + 1} (Score: ${res.score.toFixed(4)}):`);
          console.log(`File: ${relativePath}`);
          console.log(`Snippet: "${res.snippet}"`);
        });
      }
      console.log('---------------------------\n');
    } catch (error) {
      if (options.json) {
        process.stdout.write(JSON.stringify({ ok: false, error: String(error instanceof Error ? error.message : error) }) + '\n');
      } else {
        handleError(error);
      }
    }
  });

program
  .command('install-skill')
  .description('Install the engramify skill to ~/.claude/skills/engramify/SKILL.md')
  .action(() => {
    const src = path.join(__dirname, 'SKILL.md');
    const dest = path.join(os.homedir(), '.claude', 'skills', 'engramify', 'SKILL.md');
    const destDir = path.dirname(dest);

    if (!fs.existsSync(src)) {
      console.error(`Skill file not found at ${src}. Try rebuilding with: npm run build`);
      process.exit(1);
    }

    fs.mkdirSync(destDir, { recursive: true });
    fs.copyFileSync(src, dest);
    console.log(`Skill installed to ${dest}`);
  });

program.parse(process.argv);
