const MODEL_ID = process.env.DEVMEMORY_EMBED_MODEL || "Xenova/all-MiniLM-L6-v2";
const XENOVA_IMPORT_TARGET = process.env.DEVMEMORY_XENOVA_IMPORT || "@xenova/transformers";

let extractorPromise: Promise<any> | null = null;
let warnedOnce = false;
let initialized = false;
let provider: "xenova-wasm" | "fallback" | "uninitialized" = "uninitialized";
let dimensions = 0;
let lastError: string | null = null;
let successLogged = false;
const dynamicImport = new Function("m", "return import(m)") as (moduleName: string) => Promise<any>;

function fallbackEmbedding(text: string): Float32Array {
  const maxDim = 128;
  const vec = new Float32Array(maxDim);
  for (let i = 0; i < maxDim; i++) {
    vec[i] = i < text.length ? (text.charCodeAt(i) % 256) / 255 : 0;
  }
  return vec;
}

async function getExtractor(): Promise<any> {
  if (extractorPromise) return extractorPromise;

  extractorPromise = (async () => {
    const { env, pipeline } = await dynamicImport(XENOVA_IMPORT_TARGET);

    // Enforce pure WASM backend so we avoid native Node addons and keep
    // packaging cross-platform for a single VSIX artifact.
    if (env?.backends?.onnx?.wasm) {
      env.backends.onnx.wasm.proxy = false;
      env.backends.onnx.wasm.numThreads = 1;
    }

    return pipeline("feature-extraction", MODEL_ID, {
      quantized: true
    });
  })();

  return extractorPromise;
}

function toVector(result: any): Float32Array {
  if (result?.data && typeof result.data.length === "number") {
    return Float32Array.from(result.data as Iterable<number>);
  }

  if (Array.isArray(result)) {
    if (result.length > 0 && Array.isArray(result[0])) {
      return Float32Array.from(result[0] as number[]);
    }
    return Float32Array.from(result as number[]);
  }

  throw new Error("Unsupported embedding output shape.");
}

export async function embedText(text: string): Promise<Float32Array> {
  try {
    const extractor = await getExtractor();
    const output = await extractor(text, { pooling: "mean", normalize: true });
    const vector = toVector(output);
    initialized = true;
    provider = "xenova-wasm";
    dimensions = vector.length;
    lastError = null;
    if (!successLogged) {
      successLogged = true;
      console.error(`[embed] provider=${provider} model=${MODEL_ID} dim=${dimensions}`);
    }
    return vector;
  } catch (err) {
    initialized = true;
    provider = "fallback";
    dimensions = 128;
    lastError = String(err);
    if (!warnedOnce) {
      warnedOnce = true;
      console.error(
        "[embed] WASM embedding pipeline failed; falling back to deterministic embedding:",
        err
      );
    }
    return fallbackEmbedding(text);
  }
}

export function getEmbeddingStatus() {
  return {
    initialized,
    provider,
    model: MODEL_ID,
    dimensions,
    fallback: provider === "fallback",
    lastError
  };
}

export async function warmupEmbedding(): Promise<void> {
  await embedText("dev-memory warmup");
}
