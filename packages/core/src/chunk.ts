import fs from "fs/promises";
import path from "path";

const TARGET_CHUNK_MIN_TOKENS = 160;
const TARGET_CHUNK_MAX_TOKENS = 320;

export interface ChunkMetadata {
  text: string;
  startLine: number;
  endLine: number;
  kind: "symbol" | "heading" | "comment" | "block";
  symbolName?: string;
  language: string;
}

interface Segment {
  lines: string[];
  startLine: number;
  endLine: number;
  kind: ChunkMetadata["kind"];
  symbolName?: string;
}

function tokenCount(s: string): number {
  const trimmed = s.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

function detectLanguage(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const map: Record<string, string> = {
    ".ts": "typescript",
    ".tsx": "typescript",
    ".js": "javascript",
    ".jsx": "javascript",
    ".py": "python",
    ".java": "java",
    ".kt": "kotlin",
    ".go": "go",
    ".rs": "rust",
    ".c": "c",
    ".cpp": "cpp",
    ".h": "c-header",
    ".cs": "csharp",
    ".rb": "ruby",
    ".php": "php",
    ".swift": "swift",
    ".scala": "scala",
    ".sh": "shell",
    ".json": "json",
    ".yml": "yaml",
    ".yaml": "yaml",
    ".xml": "xml",
    ".md": "markdown",
    ".txt": "text"
  };
  return map[ext] || "text";
}

function isHeading(line: string): boolean {
  return /^#{1,6}\s+/.test(line.trim());
}

function isCommentLine(line: string): boolean {
  const t = line.trim();
  return t.startsWith("//") || t.startsWith("#") || t.startsWith("/*") || t.startsWith("*") || t.startsWith("--");
}

function detectSymbol(line: string): { symbolName?: string } | null {
  const t = line.trim();
  const patterns: RegExp[] = [
    /^(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_][A-Za-z0-9_]*)/,
    /^(?:export\s+)?class\s+([A-Za-z_][A-Za-z0-9_]*)/,
    /^(?:export\s+)?interface\s+([A-Za-z_][A-Za-z0-9_]*)/,
    /^(?:export\s+)?type\s+([A-Za-z_][A-Za-z0-9_]*)/,
    /^(?:export\s+)?const\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(?:async\s*)?\(/,
    /^def\s+([A-Za-z_][A-Za-z0-9_]*)/,
    /^fn\s+([A-Za-z_][A-Za-z0-9_]*)/,
    /^(?:public|private|protected)\s+(?:async\s+)?(?:[\w<>\[\],?]+\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*\(/
  ];
  for (const p of patterns) {
    const m = t.match(p);
    if (m) return { symbolName: m[1] };
  }
  return null;
}

function splitOversizedSegment(seg: Segment): Segment[] {
  const text = seg.lines.join("\n");
  if (tokenCount(text) <= TARGET_CHUNK_MAX_TOKENS) return [seg];

  const out: Segment[] = [];
  let current: string[] = [];
  let currentStart = seg.startLine;
  let currentTokens = 0;

  for (let i = 0; i < seg.lines.length; i++) {
    const line = seg.lines[i];
    const lineTokens = tokenCount(line);
    if (current.length > 0 && currentTokens + lineTokens > TARGET_CHUNK_MAX_TOKENS) {
      out.push({
        lines: current,
        startLine: currentStart,
        endLine: seg.startLine + i - 1,
        kind: seg.kind,
        symbolName: seg.symbolName
      });
      current = [];
      currentStart = seg.startLine + i;
      currentTokens = 0;
    }
    current.push(line);
    currentTokens += lineTokens;
  }

  if (current.length > 0) {
    out.push({
      lines: current,
      startLine: currentStart,
      endLine: seg.endLine,
      kind: seg.kind,
      symbolName: seg.symbolName
    });
  }
  return out;
}

function buildSegments(lines: string[]): Segment[] {
  const segments: Segment[] = [];
  let current: Segment | null = null;

  const flush = () => {
    if (!current || current.lines.length === 0) return;
    segments.push(current);
    current = null;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNo = i + 1;
    const trimmed = line.trim();
    const symbol = detectSymbol(line);
    const heading = isHeading(line);
    const comment = isCommentLine(line);

    if (heading || symbol) {
      flush();
      current = {
        lines: [line],
        startLine: lineNo,
        endLine: lineNo,
        kind: heading ? "heading" : "symbol",
        symbolName: symbol?.symbolName
      };
      continue;
    }

    if (!current) {
      current = {
        lines: [line],
        startLine: lineNo,
        endLine: lineNo,
        kind: comment ? "comment" : "block"
      };
      continue;
    }

    if (trimmed === "" && tokenCount(current.lines.join("\n")) >= TARGET_CHUNK_MIN_TOKENS) {
      flush();
      continue;
    }

    current.lines.push(line);
    current.endLine = lineNo;
  }

  flush();
  return segments.flatMap(splitOversizedSegment);
}

function mergeSmallSegments(segments: Segment[]): Segment[] {
  const merged: Segment[] = [];
  for (const seg of segments) {
    const segTokens = tokenCount(seg.lines.join("\n"));
    const prev = merged[merged.length - 1];
    if (
      prev &&
      seg.kind === "block" &&
      prev.kind === "block" &&
      tokenCount(prev.lines.join("\n")) + segTokens <= TARGET_CHUNK_MAX_TOKENS
    ) {
      prev.lines.push(...seg.lines);
      prev.endLine = seg.endLine;
      continue;
    }
    merged.push({ ...seg, lines: [...seg.lines] });
  }
  return merged;
}

export async function chunkFileWithMetadata(filePath: string): Promise<ChunkMetadata[]> {
  const content = await fs.readFile(filePath, "utf-8");
  const lines = content.split("\n");
  const language = detectLanguage(filePath);
  const baseSegments = buildSegments(lines);
  const segments = mergeSmallSegments(baseSegments);

  return segments
    .map((seg) => ({
      text: seg.lines.join("\n").trim(),
      startLine: seg.startLine,
      endLine: seg.endLine,
      kind: seg.kind,
      symbolName: seg.symbolName,
      language
    }))
    .filter((c) => c.text.length > 0);
}

export async function chunkFile(filePath: string): Promise<string[]> {
  const chunks = await chunkFileWithMetadata(filePath);
  return chunks.map((c) => c.text);
}
