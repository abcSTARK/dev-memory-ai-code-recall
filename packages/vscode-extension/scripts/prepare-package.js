const fs = require('fs');
const path = require('path');
const fse = require('fs-extra');

const root = path.resolve(__dirname, '..');
const out = path.join(root, '.vsce-dist');

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

  // We deliberately *do not* copy the packages folder or any node_modules; the
  // bundle contains everything the server needs, and the extension itself has
  // no runtime dependencies once compiled.  Keeping the VSIX small improves
  // install/upgrade time and avoids shipping development artifacts.

  // no runtime dependencies to copy any more; the server bundle is fully
  // self-contained and does not rely on any outside node_modules.

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
