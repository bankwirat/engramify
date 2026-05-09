---
name: engramify
description: "Local semantic memory and keyword search CLI for AI agents. Use when you need to store text for later recall, search memory by meaning (vector), or search files by keyword (BM25)."
trigger: /engramify
---

# engramify

A lightweight, local CLI for storing and retrieving text memory. Two retrieval modes: semantic vector search over stored memory chunks, and BM25 keyword search over files on disk.

## Commands

```
engramify add "<text>"                        # store a text chunk in local memory
engramify search "<query>"                    # semantic search over stored memory (vector)
engramify search "<query>" -k 10             # return top 10 results
engramify bm25 <folder> "<query>"            # BM25 keyword search over files in a folder
engramify bm25 <folder> "<query>" -k 10     # return top 10 results
```

## When to use each command

- **`add`** — persist a text chunk (a note, a fact, a summary) so it can be recalled later via `search`.
- **`search`** — find stored memory chunks by meaning, not exact words. Best when the query is conceptual or paraphrased.
- **`bm25`** — find files on disk that contain specific terms. Best for keyword-heavy queries, code searches, or when you know the exact words you're looking for.

## What engramify is for

engramify gives agents persistent, local memory without a remote vector database.

- `add` + `search` = semantic recall across sessions. Store anything — summaries, facts, decisions — and retrieve the most relevant chunks by embedding similarity.
- `bm25` = file-scoped keyword retrieval. Point it at any folder and it recursively scores every readable file against your query using BM25, returning ranked results with file paths and snippets.

## Output format

**`search` output:**
```
Result 1 (Score: 0.9231) [2025-01-01 12:00:00]:
"the stored text chunk"
```

**`bm25` output:**
```
Result 1 (Score: 4.2100):
File: src/retrieval.ts
Snippet: "...matching text excerpt..."
```

## When invoked as a skill

If the user types `/engramify`, ask what they want to do:
- Store something → `engramify add "<text>"`
- Recall something from memory → `engramify search "<query>"`
- Search files on disk → `engramify bm25 <folder> "<query>"`

Run the appropriate command via Bash and present the results.
