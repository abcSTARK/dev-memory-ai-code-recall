// Simple deterministic embedding: map character codes into a fixed-size vector.
// This avoids any native dependencies and keeps the extension lightweight.

export async function embedText(text: string): Promise<Float32Array> {
  const maxDim = 128;
  const vec = new Float32Array(maxDim);
  for (let i = 0; i < maxDim; i++) {
    if (i < text.length) {
      vec[i] = (text.charCodeAt(i) % 256) / 255;
    } else {
      vec[i] = 0;
    }
  }
  return vec;
}
