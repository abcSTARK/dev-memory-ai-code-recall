import fs from "fs";
import path from "path";
import { embedText } from "./embed";

interface StoredItem {
  id: string;
  text: string;
  embedding: number[];
  metadata?: Record<string, any>;
}

let store: StoredItem[] = [];
let storeFilePath: string | null = null;

function ensureDirExists(dir: string) {
  try {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  } catch {
    // ignore
  }
}

function loadStore(filePath: string) {
  try {
    const txt = fs.readFileSync(filePath, "utf8");
    store = JSON.parse(txt) || [];
  } catch {
    // corrupted or empty, start fresh
    store = [];
    try {
      fs.writeFileSync(filePath, JSON.stringify(store));
    } catch {}
  }
}

function saveStore() {
  if (!storeFilePath) return;
  try {
    fs.writeFileSync(storeFilePath, JSON.stringify(store));
  } catch {
    // ignore write failures; best-effort persistence
  }
}

function normalize(vec: number[]): number[] {
  let norm = 0;
  for (let i = 0; i < vec.length; i++) norm += vec[i] * vec[i];
  norm = Math.sqrt(norm);
  if (norm === 0) return vec.map(() => 0);
  return vec.map((v) => v / norm);
}

/**
 * Initialize the on‑disk store for the given workspace.  Must be called before
 * any other vector operations.  Creates `.dev-memory/index.json` and adds the
 * folder to `.gitignore` if necessary.
 */
export function initializeStore(workspaceRoot: string): void {
  if (!workspaceRoot) return;
  const devDir = path.join(workspaceRoot, ".dev-memory");
  ensureDirExists(devDir);
  const idx = path.join(devDir, "index.json");
  storeFilePath = idx;
  if (fs.existsSync(idx)) {
    loadStore(idx);
  } else {
    store = [];
    try {
      fs.writeFileSync(idx, JSON.stringify(store));
    } catch {}
  }

  // ensure .dev-memory is gitignored
  const gitignore = path.join(workspaceRoot, ".gitignore");
  try {
    if (fs.existsSync(gitignore)) {
      let txt = fs.readFileSync(gitignore, "utf8");
      if (!txt.includes(".dev-memory")) {
        if (!txt.endsWith("\n")) txt += "\n";
        txt += ".dev-memory/\n";
        fs.writeFileSync(gitignore, txt);
      }
    } else {
      fs.writeFileSync(gitignore, ".dev-memory/\n");
    }
  } catch {
    // ignore
  }
}

/**
 * Add a new embedding record to the store.  Persists immediately.
 */
export function addEmbedding(item: {
  id: string;
  text: string;
  embedding: number[];
  metadata?: Record<string, any>;
}): void {
  if (!storeFilePath) {
    throw new Error("Store not initialized");
  }
  store.push(item);
  saveStore();
}

/**
 * Search the store for the k nearest items (cosine similarity).
 */
export function searchSimilar(
  queryEmbedding: number[],
  k = 5
): Array<{
  id: string;
  text: string;
  score: number;
  metadata?: Record<string, any>;
}> {
  if (!storeFilePath) {
    throw new Error("Store not initialized");
  }
  const qn = normalize(queryEmbedding);
  const results = store.map((item) => {
    const emb = normalize(item.embedding);
    let score = 0;
    const len = Math.min(emb.length, qn.length);
    for (let i = 0; i < len; i++) {
      score += emb[i] * qn[i];
    }
    return { id: item.id, text: item.text, metadata: item.metadata, score };
  });
  results.sort((a, b) => b.score - a.score);
  return results.slice(0, k);
}