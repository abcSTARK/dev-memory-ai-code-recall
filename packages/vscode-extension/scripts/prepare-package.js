const fs = require('fs');
const path = require('path');
const fse = require('fs-extra');

const root = path.resolve(__dirname, '..');
const out = path.join(root, '.vsce-dist');
const repoRoot = path.resolve(root, '..', '..');

function splitPkgName(name) {
  return name.startsWith('@') ? name.split('/').slice(0, 2) : [name];
}

function pkgDir(baseNodeModules, name) {
  return path.join(baseNodeModules, ...splitPkgName(name));
}

async function copyRuntimeDependencyTree() {
  const srcNodeModules = path.join(repoRoot, 'node_modules');
  const outNodeModules = path.join(out, 'dist', 'runtime', 'node_modules');
  const visited = new Set();
  const skipNative = new Set(['sharp']);
  const queue = ['@xenova/transformers', 'onnxruntime-web', '@huggingface/jinja'];

  while (queue.length > 0) {
    const dep = queue.shift();
    if (!dep || visited.has(dep) || skipNative.has(dep)) continue;
    visited.add(dep);

    const src = pkgDir(srcNodeModules, dep);
    const dst = pkgDir(outNodeModules, dep);
    if (!fs.existsSync(src)) {
      throw new Error(`Missing runtime dependency at ${src}. Run npm install at repo root first.`);
    }
    await fse.copy(src, dst);

    const pkgJsonPath = path.join(src, 'package.json');
    if (!fs.existsSync(pkgJsonPath)) continue;
    const pkgJson = JSON.parse(await fs.promises.readFile(pkgJsonPath, 'utf8'));
    const deps = Object.keys(pkgJson.dependencies || {});
    for (const d of deps) {
      if (!visited.has(d) && !skipNative.has(d)) queue.push(d);
    }
  }

  // Provide a lightweight stub so module resolution succeeds without shipping
  // native sharp binaries. Image paths are not used for text embedding.
  const sharpDir = path.join(outNodeModules, 'sharp');
  await fse.mkdirp(sharpDir);
  await fs.promises.writeFile(
    path.join(sharpDir, 'package.json'),
    JSON.stringify({ name: 'sharp', version: '0.0.0-stub', main: 'index.js' }, null, 2)
  );
  await fs.promises.writeFile(
    path.join(sharpDir, 'index.js'),
    "module.exports = function sharpStub() { throw new Error('sharp is not bundled in this VSIX (text embeddings only).'); }; module.exports.default = module.exports;\n"
  );

  // Force pure WASM execution by stubbing `onnxruntime-node` with the
  // web runtime implementation. This avoids native binaries while satisfying
  // Xenova's node-environment import path.
  const ortNodeDir = path.join(outNodeModules, 'onnxruntime-node');
  await fse.mkdirp(ortNodeDir);
  await fs.promises.writeFile(
    path.join(ortNodeDir, 'package.json'),
    JSON.stringify({ name: 'onnxruntime-node', version: '0.0.0-stub', main: 'index.js' }, null, 2)
  );
  await fs.promises.writeFile(
    path.join(ortNodeDir, 'index.js'),
    "module.exports = require('onnxruntime-web'); module.exports.default = module.exports;\n"
  );
}

async function prepare() {
  await fse.remove(out);
  await fse.mkdirp(out);

  // Copy only the files that are required for the shipped extension.  The
  // MCP server is bundled into `dist/mcp-server.bundle.js` so there is no need
  // to include the entire `packages/` tree or any node_modules.
  await fse.copy(path.join(root, 'dist'), path.join(out, 'dist'));
  await fse.copy(path.join(root, 'assets'), path.join(out, 'assets')).catch(() => {});
  await fse.copy(path.join(root, 'README.md'), path.join(out, 'README.md')).catch(() => {});
  await fse.copy(path.join(root, 'LICENSE.txt'), path.join(out, 'LICENSE.txt')).catch(() => {});

  await copyRuntimeDependencyTree();

  // Clean package.json
  const pkg = require(path.join(root, 'package.json'));
  delete pkg.devDependencies;
  delete pkg.scripts;

  await fs.promises.writeFile(
    path.join(out, 'package.json'),
    JSON.stringify(pkg, null, 2)
  );

  console.log('Prepared clean VSCE package folder.');
}

prepare();
