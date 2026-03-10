#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const WORKSPACE_ROOTS = [
  { rootName: 'packages', absolutePath: path.join(ROOT, 'packages') },
  { rootName: 'apps', absolutePath: path.join(ROOT, 'apps') },
];

function readJson(filePath) {
  const txt = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(txt);
}

function writeJsonPretty(filePath, obj) {
  // Preserve typical repo formatting: 2-space indent, trailing newline
  fs.writeFileSync(filePath, JSON.stringify(obj, null, 2) + '\n', 'utf8');
}

function exists(p) {
  try {
    fs.accessSync(p, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function isWorkspaceDepVersion(version) {
  // Accept workspace:* and workspace:^ / workspace:~ patterns if you ever use them
  return typeof version === 'string' && version.startsWith('workspace:');
}

function toPosixPath(value) {
  return value.split(path.sep).join('/');
}

function getWorkspaceDeps(pkgJson) {
  const deps = {
    ...(pkgJson.dependencies ?? {}),
    ...(pkgJson.devDependencies ?? {}),
    ...(pkgJson.peerDependencies ?? {}),
    ...(pkgJson.optionalDependencies ?? {}),
  };

  return Object.entries(deps)
    .filter(([, v]) => isWorkspaceDepVersion(v))
    .map(([name]) => name);
}

function listWorkspaceEntries() {
  const entries = [];

  for (const workspaceRoot of WORKSPACE_ROOTS) {
    if (!exists(workspaceRoot.absolutePath)) continue;

    const dirs = fs
      .readdirSync(workspaceRoot.absolutePath, { withFileTypes: true })
      .filter((dirent) => dirent.isDirectory())
      .map((dirent) => dirent.name);

    for (const dir of dirs) {
      const absoluteDir = path.join(workspaceRoot.absolutePath, dir);
      const packageJsonPath = path.join(absoluteDir, 'package.json');
      const tsconfigPath = path.join(absoluteDir, 'tsconfig.json');

      if (!exists(packageJsonPath)) continue;

      entries.push({
        dir,
        rootName: workspaceRoot.rootName,
        relativeDir: `${workspaceRoot.rootName}/${dir}`,
        absoluteDir,
        packageJsonPath,
        tsconfigPath,
      });
    }
  }

  return entries;
}

function loadPackagesMap() {
  // Map package name -> workspace entry
  const map = new Map();

  for (const entry of listWorkspaceEntries()) {
    const pkg = readJson(entry.packageJsonPath);
    if (pkg?.name) map.set(pkg.name, entry);
  }

  return map;
}

function normalizeReferences(tsconfig, refs) {
  // Ensure stable ordering, stable shape
  tsconfig.references = refs.map((p) => ({ path: p }));
  return tsconfig;
}

function main() {
  const nameToDir = loadPackagesMap();
  const workspaceEntries = Array.from(nameToDir.values());

  let changedCount = 0;
  const warnings = [];

  for (const entry of workspaceEntries) {
    if (!exists(entry.tsconfigPath)) continue;

    const pkgJson = readJson(entry.packageJsonPath);
    const tsconfig = readJson(entry.tsconfigPath);

    // Only touch composite projects (your intended target set)
    if (!tsconfig?.compilerOptions?.composite) continue;

    const wsDepNames = getWorkspaceDeps(pkgJson);

    const refs = wsDepNames
      .map((depName) => {
        const depEntry = nameToDir.get(depName);
        if (!depEntry) {
          warnings.push(
            `[WARN] ${pkgJson.name}: dependency ${depName} is workspace:* but no workspace package.json named ${depName} was found`
          );
          return null;
        }
        return toPosixPath(path.relative(entry.absoluteDir, depEntry.absoluteDir));
      })
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));

    const before = JSON.stringify(tsconfig.references ?? []);
    normalizeReferences(tsconfig, refs);
    const after = JSON.stringify(tsconfig.references);

    if (before !== after) {
      writeJsonPretty(entry.tsconfigPath, tsconfig);
      changedCount++;
      console.log(`[UPDATED] ${entry.relativeDir}/tsconfig.json references (${refs.length})`);
    }
  }

  for (const w of warnings) console.warn(w);

  console.log(`\nDone. Updated ${changedCount} tsconfig.json file(s).`);
}

main();
