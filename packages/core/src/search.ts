import { embedText } from "./embed";
import { initializeStore, searchSimilar } from "./vector-store";
import { SearchResult } from "./types";

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "how",
  "in",
  "is",
  "it",
  "of",
  "on",
  "or",
  "that",
  "the",
  "this",
  "to",
  "what",
  "where",
  "which",
  "with",
  "class",
  "command",
  "function",
  "implementation",
  "implemented",
  "register",
  "registered"
]);

function tokenize(text: string): string[] {
  return (text.toLowerCase().match(/[a-z0-9_]+/g) || []).filter((t) => t.length > 1);
}

function normalizeQuery(query: string): string {
  let q = query.toLowerCase().trim();
  q = q.replace(/^search\s+this\s+codebase\s+for\s+/, "");
  q = q.replace(/^search\s+the\s+codebase\s+for\s+/, "");
  q = q.replace(/^find\s+where\s+/, "where ");
  q = q.replace(/^answer\s+from\s+codebase:\s*/, "");
  return q;
}

function overlapScore(query: string, text: string): number {
  const q = new Set(tokenize(query));
  if (q.size === 0) return 0;
  const t = new Set(tokenize(text));
  let matches = 0;
  for (const token of q) {
    if (t.has(token)) matches += 1;
  }
  return matches / q.size;
}

function keywordCoverageScore(query: string, text: string): number {
  const qTokens = tokenize(query).filter((t) => t.length > 2 && !STOP_WORDS.has(t));
  if (qTokens.length === 0) return 0;
  const textTokens = tokenize(text);
  const t = new Set(textTokens);
  let matches = 0;
  for (const token of qTokens) {
    if (t.has(token)) {
      matches += 1;
      continue;
    }
    // Allow partial token match (e.g. "welcome" -> "openWelcome").
    if (token.length >= 4 && textTokens.some((tt) => tt.includes(token) || token.includes(tt))) {
      matches += 1;
    }
  }
  return matches / qTokens.length;
}

function isCodeFile(filePath: string): boolean {
  return /\.(ts|tsx|js|jsx|py|java|kt|go|rs|c|cpp|h|cs|rb|php|swift|scala|sh|json|yml|yaml|xml)$/i.test(filePath);
}

function isDocFile(filePath: string): boolean {
  return /\.(md|txt)$/i.test(filePath);
}

function isImplementationIntent(query: string): boolean {
  const q = query.toLowerCase();
  return (
    q.includes("where") ||
    q.includes("implemented") ||
    q.includes("implementation") ||
    q.includes("register") ||
    q.includes("command") ||
    q.includes("function") ||
    q.includes("class")
  );
}

function isDocIntent(query: string): boolean {
  const q = query.toLowerCase();
  return q.includes("readme") || q.includes("docs") || q.includes("documentation");
}

export async function semanticSearch(query: string, k = 5, rootPath?: string): Promise<SearchResult[]> {
  const normalizedQuery = normalizeQuery(query);
  const queryEmbedding = await embedText(normalizedQuery);
  if (rootPath) initializeStore(rootPath);
  const candidateK = Math.min(Math.max(k * 25, 80), 600);
  const candidates = searchSimilar(Array.from(queryEmbedding), candidateK);
  const implIntent = isImplementationIntent(normalizedQuery);
  const docIntent = isDocIntent(normalizedQuery);

  const reranked = candidates.map((r: any) => {
    const filePath = r.metadata?.filePath || "";
    const chunk = String(r.text || "");
    const kind = String(r.metadata?.kind || "");
    const symbolName = String(r.metadata?.symbolName || "");
    const haystack = `${filePath}\n${chunk}`;
    const lexical = overlapScore(normalizedQuery, haystack);
    const keywordCoverage = keywordCoverageScore(normalizedQuery, haystack);
    const queryTokens = tokenize(normalizedQuery).filter((t) => t.length > 2 && !STOP_WORDS.has(t));
    let score = Number(r.score || 0);

    // Blend semantic + lexical signal
    score = score * 0.72 + lexical * 0.10 + keywordCoverage * 0.45;

    // Generic bonus when most significant query terms are present together.
    const strongCoverage = queryTokens.length >= 2 && keywordCoverage >= 0.66;
    if (strongCoverage) score += 0.12;

    // Prefer source code for "where/how implemented" style questions.
    if (implIntent) {
      if (isCodeFile(filePath)) score += 0.12;
      if (isDocFile(filePath)) score -= 0.45;
      const asksForCommand = queryTokens.includes("command");
      const asksForRegister = queryTokens.includes("register") || queryTokens.includes("registered");
      const hasSpecificTermMatch = keywordCoverage > 0;
      if (asksForCommand && hasSpecificTermMatch && /registerCommand|register\(/.test(chunk)) score += 0.22;
      if (asksForRegister && /registerCommand|registerTool|register\(/.test(chunk)) score += 0.10;
      if (kind === "symbol") score += 0.10;
      if (kind === "heading" || kind === "comment") score -= 0.08;
      if (symbolName && /register|open|command/i.test(symbolName)) score += 0.06;
      if (/devmemory\./i.test(chunk)) score += 0.05;
      if (/\/src\//.test(filePath.replace(/\\/g, "/"))) score += 0.05;
      if (/\/README\.md$/i.test(filePath) || /\/CHANGELOG\.md$/i.test(filePath)) score -= 0.20;
    }

    // Prefer docs for explicit docs/readme questions.
    if (docIntent) {
      if (isDocFile(filePath)) score += 0.15;
      if (isCodeFile(filePath)) score -= 0.05;
    }

    return {
      filePath,
      chunk,
      score
    };
  });

  reranked.sort((a, b) => b.score - a.score);
  const uniqueByFile: typeof reranked = [];
  const seenFiles = new Set<string>();
  for (const row of reranked) {
    if (seenFiles.has(row.filePath)) continue;
    seenFiles.add(row.filePath);
    uniqueByFile.push(row);
    if (uniqueByFile.length >= k) return uniqueByFile;
  }
  return uniqueByFile;
}
