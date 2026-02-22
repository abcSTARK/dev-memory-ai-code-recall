const fs = require('fs');
const path = require('path');
const fse = require('fs-extra');

const root = path.resolve(__dirname, '..');
const out = path.join(root, '.vsce-dist');

async function prepare() {
  await fse.remove(out);
  await fse.mkdirp(out);

  // Copy required files
  await fse.copy(path.join(root, 'dist'), path.join(out, 'dist'));
  await fse.copy(path.join(root, 'assets'), path.join(out, 'assets')).catch(() => {});
  await fse.copy(path.join(root, 'README.md'), path.join(out, 'README.md')).catch(() => {});
  await fse.copy(path.join(root, 'LICENSE.txt'), path.join(out, 'LICENSE.txt')).catch(() => {});

  // Also include prebuilt mcp-server and core packages if available (so VSIX is self-contained)
  const repoRoot = path.resolve(root, '..', '..');
  const packagesToEmbed = ['mcp-server', 'core'];
  for (const pkgName of packagesToEmbed) {
    const pkgDir = path.join(repoRoot, 'packages', pkgName);
    const pkgDist = path.join(pkgDir, 'dist');
    if (fs.existsSync(pkgDir)) {
      // If dist missing, try to build the package
      if (!fs.existsSync(pkgDist)) {
        try {
          console.log(`Building package ${pkgName}...`);
          const execa = require('child_process').spawnSync;
          execa('npm', ['install'], { cwd: pkgDir, shell: true, stdio: 'inherit' });
          execa('npx', ['tsc', '-p', 'tsconfig.json'], { cwd: pkgDir, shell: true, stdio: 'inherit' });
        } catch (err) {
          console.warn(`Failed to build ${pkgName}:`, err);
        }
      }

      // Copy dist, package.json and node_modules (if present) into the VSCE dist
      const outPkgDir = path.join(out, 'packages', pkgName);
      await fse.mkdirp(outPkgDir);
      await fse.copy(path.join(pkgDir, 'package.json'), path.join(outPkgDir, 'package.json')).catch(() => {});
      await fse.copy(pkgDist, path.join(outPkgDir, 'dist')).catch(() => {});
      // If we have a prebuilt bundle in the extension dist, also copy it into the
      // embedded mcp-server dist so the extension can run the bundle from the
      // package folder (this helps Node resolve node_modules correctly).
      try {
        const extBundle = path.join(root, 'dist', 'mcp-server.bundle.js');
        const targetBundle = path.join(outPkgDir, 'dist', 'mcp-server.bundle.js');
        if (fs.existsSync(extBundle)) {
          await fse.copy(extBundle, targetBundle).catch(() => {});
        }
      } catch (err) {
        // ignore
      }
      await fse.copy(path.join(pkgDir, 'node_modules'), path.join(outPkgDir, 'node_modules')).catch(() => {});
      // If this is the core package, also make it available under the mcp-server's node_modules
      // so that require('@devmemory/core') resolves when the MCP server is run from the installed extension.
      if (pkgName === 'core') {
        const mcpNodeModules = path.join(out, 'packages', 'mcp-server', 'node_modules', '@devmemory', 'core');
        await fse.mkdirp(mcpNodeModules);
        await fse.copy(path.join(pkgDir, 'package.json'), path.join(mcpNodeModules, 'package.json')).catch(() => {});
        await fse.copy(pkgDist, path.join(mcpNodeModules, 'dist')).catch(() => {});
        // Also copy core's runtime dependencies (node_modules/*) into the mcp-server node_modules root
        // so that requires like 'glob' resolve when the mcp-server runs from the extension.
        const coreNodeModules = path.join(pkgDir, 'node_modules');
        const targetMcpNodeModules = path.join(out, 'packages', 'mcp-server', 'node_modules');
        await fse.mkdirp(targetMcpNodeModules);

        // Copy all existing node_modules from the core package folder (if present)
        if (fs.existsSync(coreNodeModules)) {
          const deps = await fs.promises.readdir(coreNodeModules);
          for (const dep of deps) {
            const src = path.join(coreNodeModules, dep);
            const dest = path.join(targetMcpNodeModules, dep);
            await fse.copy(src, dest).catch(() => {});
          }
        }

        // Also ensure top-level runtime dependencies listed in core's package.json are copied
        // into the embedded mcp-server node_modules and also into the top-level extension node_modules
        try {
          const corePkg = require(path.join(pkgDir, 'package.json'));
          const depNames = Object.keys(corePkg.dependencies || {});
          for (const depName of depNames) {
            const destInMcp = path.join(targetMcpNodeModules, depName);
            if (!fs.existsSync(destInMcp)) {
              // Prefer package-local node_modules, then repo root node_modules
              const candidatePaths = [
                path.join(pkgDir, 'node_modules', depName),
                path.join(repoRoot, 'node_modules', depName)
              ];
              for (const cand of candidatePaths) {
                if (fs.existsSync(cand)) {
                  await fse.copy(cand, destInMcp).catch(() => {});
                  break;
                }
              }
            }

            // (no top-level copy here) the mcp-server's own node_modules will be used at runtime
          }
        } catch (err) {
          // ignore errors reading core package.json
        }
      }
    }
  }

  // Ensure known transitive runtime deps required by embedded packages are present.
  // For example, @lancedb/lancedb expects 'apache-arrow' which may be installed at
  // the repo root node_modules. If @lancedb was copied into the embedded mcp-server
  // node_modules, copy apache-arrow from the repo root into the embedded node_modules
  // so runtime require() succeeds when the bundle runs from the package folder.
  try {
    const embeddedMcpNodeModules = path.join(out, 'packages', 'mcp-server', 'node_modules');
    const lancedbInEmbedded = path.join(embeddedMcpNodeModules, '@lancedb', 'lancedb');
    const repoApacheArrow = path.join(repoRoot, 'node_modules', 'apache-arrow');
    const targetApacheArrow = path.join(embeddedMcpNodeModules, 'apache-arrow');
    if (fs.existsSync(lancedbInEmbedded) && fs.existsSync(repoApacheArrow) && !fs.existsSync(targetApacheArrow)) {
      await fse.copy(repoApacheArrow, targetApacheArrow).catch(() => {});
      // also copy any nested deps under apache-arrow/node_modules if present
      const repoAADeep = path.join(repoApacheArrow, 'node_modules');
      if (fs.existsSync(repoAADeep)) {
        const entries = await fs.promises.readdir(repoAADeep);
        for (const e of entries) {
          const src = path.join(repoAADeep, e);
          const dest = path.join(embeddedMcpNodeModules, e);
          if (!fs.existsSync(dest)) {
            await fse.copy(src, dest).catch(() => {});
          }
        }
      }
    }
  } catch (err) {
    // non-fatal
  }

  // Explicitly ensure the full @lancedb package (including platform-specific
  // optional subpackages) is copied into the embedded mcp-server node_modules.
  try {
    const embeddedMcpNodeModules = path.join(out, 'packages', 'mcp-server', 'node_modules');
    const repoLancedb = path.join(repoRoot, 'node_modules', '@lancedb');
    const targetLancedb = path.join(embeddedMcpNodeModules, '@lancedb');
    if (fs.existsSync(repoLancedb)) {
      // Ensure target directory exists
      await fse.mkdirp(targetLancedb);
      const entries = await fs.promises.readdir(repoLancedb);
      for (const entry of entries) {
        const src = path.join(repoLancedb, entry);
        const dest = path.join(targetLancedb, entry);
        if (!fs.existsSync(dest)) {
          await fse.copy(src, dest).catch((e) => {
            console.warn(`Failed to copy @lancedb/${entry}:`, e && e.message);
          });
        }
      }
    }
  } catch (err) {
    // non-fatal
  }

  // As a last-resort option, copy the entire repo node_modules into the embedded
  // mcp-server node_modules. This is heavy-handed but ensures all installed
  // transitive dependencies (including tslib and native-supporting packages)
  // are available at runtime when the extension runs the bundle from the
  // embedded package folder. This will increase the VSIX size significantly.
  try {
    const repoNodeModules = path.join(repoRoot, 'node_modules');
    const embeddedMcpNodeModules = path.join(out, 'packages', 'mcp-server', 'node_modules');
    if (fs.existsSync(repoNodeModules)) {
      // Copy all top-level packages from repo node_modules into embedded mcp node_modules
      // Skip symbolic links (workspace-local package links) and .bin to avoid recursive copies
      const entries = await fs.promises.readdir(repoNodeModules);
      for (const entry of entries) {
        if (entry === '.bin') continue;
        const src = path.join(repoNodeModules, entry);
        const dest = path.join(embeddedMcpNodeModules, entry);
        try {
          const st = await fs.promises.lstat(src);
          if (st.isSymbolicLink()) {
            // skip symlinked packages (they often point back into the monorepo)
            continue;
          }
        } catch (err) {
          // if lstat fails, try copying anyway
        }
        if (!fs.existsSync(dest)) {
          await fse.copy(src, dest).catch(() => {});
        }
      }
    }
  } catch (err) {
    // ignore - not critical
  }

  // Clean package.json
  const pkg = require(path.join(root, 'package.json'));
  delete pkg.devDependencies;
  delete pkg.scripts;

  await fs.promises.writeFile(
    path.join(out, 'package.json'),
    JSON.stringify(pkg, null, 2)
  );

  // Ensure the embedded mcp-server package.json includes runtime deps from the core package
  // so that a runtime `npm install --production` executed by the launcher does not prune
  // copied packages like @lancedb. Merge core dependencies into embedded mcp-server package.json.
  try {
    const embeddedMcpPackageJson = path.join(out, 'packages', 'mcp-server', 'package.json');
    const corePkgPath = path.join(repoRoot, 'packages', 'core', 'package.json');
    if (fs.existsSync(embeddedMcpPackageJson) && fs.existsSync(corePkgPath)) {
      const embeddedPkg = require(embeddedMcpPackageJson);
      const corePkg = require(corePkgPath);
      embeddedPkg.dependencies = embeddedPkg.dependencies || {};
      // Copy runtime dependencies from core into embedded mcp-server dependencies
      for (const [dep, ver] of Object.entries(corePkg.dependencies || {})) {
        if (!embeddedPkg.dependencies[dep]) embeddedPkg.dependencies[dep] = ver;
      }
      await fs.promises.writeFile(embeddedMcpPackageJson, JSON.stringify(embeddedPkg, null, 2));
    }
  } catch (err) {
    // non-fatal
  }

  console.log('Prepared clean VSCE package folder.');
}

prepare();
