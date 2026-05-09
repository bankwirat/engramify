export interface Chunk {
  file: string
  path: string     // "filename > H1 > H2"
  heading: string  // current heading text
  level: number    // 1–3
  content: string
  checksum: string
}

function djb2(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
    hash = hash >>> 0;
  }
  return hash.toString(16);
}

export function chunkMarkdown(markdown: string, filename: string): Chunk[] {
  const lines = markdown.split('\n');
  const chunks: Chunk[] = [];

  const headingByLevel: Record<number, string> = {};
  let currentHeading = '';
  let currentLevel = 0;
  let contentLines: string[] = [];
  let inCodeBlock = false;

  function flush() {
    const content = contentLines.join('\n').trim();
    if (!content || currentLevel === 0) {
      contentLines = [];
      return;
    }
    const parents: string[] = [];
    for (let l = 1; l < currentLevel; l++) {
      if (headingByLevel[l]) parents.push(headingByLevel[l]);
    }
    chunks.push({
      file: filename,
      path: [filename, ...parents].join(' > '),
      heading: currentHeading,
      level: currentLevel,
      content,
      checksum: djb2(content),
    });
    contentLines = [];
  }

  for (const line of lines) {
    if (line.trimStart().startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      contentLines.push(line);
      continue;
    }

    if (inCodeBlock) {
      contentLines.push(line);
      continue;
    }

    const match = line.match(/^(#{1,3})\s+(.+)/);
    if (match) {
      flush();
      const level = match[1].length;
      const text = match[2].trim();
      headingByLevel[level] = text;
      // clear deeper levels
      for (let l = level + 1; l <= 3; l++) delete headingByLevel[l];
      currentHeading = text;
      currentLevel = level;
    } else {
      contentLines.push(line);
    }
  }

  flush();
  return chunks;
}
