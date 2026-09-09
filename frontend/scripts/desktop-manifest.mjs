// The manifest @electron/packager needs in the app directory it packages,
// written at package time instead of kept in the repo.
//
// desktop/ used to carry a package.json of its own, which made the shell a
// second npm project inside a pnpm one — with its own copy of the
// `bonjour-service` range, already drifted from the root's. The shell is part
// of this project, so its versions come from this project's manifest and there
// is nowhere for a second answer to live.
//
// Usage: node scripts/desktop-manifest.mjs <shell dir> <output package.json>
import fs from 'node:fs';
import path from 'node:path';
import { builtinModules } from 'node:module';

const [shellDir, outFile] = process.argv.slice(2);
if (!shellDir || !outFile) {
  console.error(
    'usage: node scripts/desktop-manifest.mjs <shell dir> <output package.json>'
  );
  process.exit(1);
}

const root = JSON.parse(
  fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8')
);
const declared = { ...root.devDependencies, ...root.dependencies };

// What the shell actually requires, read from the shell itself: a require
// added to main.cjs must not be able to go missing from the packaged app
// because someone forgot to list it here. `electron` is the runtime, not a
// dependency to install; node builtins are not dependencies at all.
const builtins = new Set(builtinModules);
const specifiers = new Set();
for (const file of fs.readdirSync(shellDir).filter(f => f.endsWith('.cjs'))) {
  const source = fs.readFileSync(path.join(shellDir, file), 'utf8');
  for (const [, specifier] of source.matchAll(
    /\brequire\(\s*['"]([^'"]+)['"]\s*\)/g
  )) {
    if (specifier.startsWith('.') || specifier.startsWith('node:')) continue;
    if (builtins.has(specifier) || specifier === 'electron') continue;
    // A subpath import (`pkg/thing`) belongs to its package.
    specifiers.add(
      specifier.startsWith('@')
        ? specifier.split('/').slice(0, 2).join('/')
        : specifier.split('/')[0]
    );
  }
}

const dependencies = {};
for (const name of [...specifiers].sort()) {
  const range = declared[name];
  if (!range) {
    console.error(
      `${name} is required by the desktop shell but is not a dependency of frontend/package.json — add it there.`
    );
    process.exit(1);
  }
  dependencies[name] = range;
}

fs.writeFileSync(
  outFile,
  JSON.stringify(
    {
      name: 'open-msupply-desktop',
      productName: 'Open mSupply',
      version: root.version,
      private: true,
      main: 'main.cjs',
      dependencies,
    },
    null,
    2
  ) + '\n'
);
console.log(
  `desktop manifest: ${
    Object.keys(dependencies).length
      ? Object.entries(dependencies)
          .map(([n, v]) => `${n}@${v}`)
          .join(', ')
      : 'no runtime dependencies'
  }`
);
