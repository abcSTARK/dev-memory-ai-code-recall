import { pipeline } from "@xenova/transformers";

let embedder: any;

export async function getEmbedder() {
  if (!embedder) {
    embedder = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
  }
  return embedder;
}

export async function embedText(text: string): Promise<Float32Array> {
  const embedderInstance = await getEmbedder();
  const embedding = await embedderInstance(text);
  return Float32Array.from(embedding[0][0]);
}
