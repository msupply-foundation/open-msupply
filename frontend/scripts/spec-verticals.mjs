/*
 * The spec's folders and verticals, at any depth under spec/.
 *
 * A vertical is a folder whose README.md opens with a scope line, the first
 * line under its heading (AUTHORING.md → Scope). Verticals nest: the
 * procurement core is spec/procurement/ and each of its stages a vertical
 * inside it (spec/procurement/plan/). A vertical's name is its path under
 * spec/ (`procurement/plan`). A file outside spec/ that is named for a
 * vertical — its src/sections/ folder, e2e suite, exploratory workflow —
 * uses its stem, the name with `-` for `/` (`procurement-plan`). Two
 * verticals with one stem would share those files, so no two may have one.
 *
 * Every top-level folder is a spec area and must declare its scope. Below
 * that, a folder with a README.md must declare its scope too, and a folder
 * without one (stock/archive/) is just a folder. A `cases/` folder belongs to
 * the vertical that holds it, so the walk never enters one.
 *
 * Plain Node, no dependencies: check-full-stack-spec.mjs imports it, and
 * server CI runs that without an install.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const SCOPE_LINE = /^> \*\*Scope: (front end|full stack)\.\*\* /;

// Folders of the spec framework itself, not spec areas.
const FRAMEWORK_DIRS = new Set(['templates']);

/**
 * The scope a README declares under its heading: 'front end', 'full stack'
 * or null.
 */
export const scopeOf = readme => {
  const [heading, ...rest] = readme.split('\n');
  const first = rest.find(line => line.trim() !== '') ?? '';
  return heading.startsWith('# ')
    ? (SCOPE_LINE.exec(first)?.[1] ?? null)
    : null;
};

/**
 * A vertical's name as a single path segment, for the files named for it
 * outside spec/.
 */
export const stem = name => name.replaceAll('/', '-');

/**
 * Every spec folder that must declare its scope, sorted by name:
 * { name, dir, readme, scope }, with `readme` false when the folder has no
 * README.md and `scope` null when it has no scope line.
 */
export const specFolders = specDir => {
  const folders = [];
  const walk = (dir, name) => {
    for (const entry of readdirSync(dir).sort()) {
      const path = join(dir, entry);
      if (entry === 'cases' || !statSync(path).isDirectory()) continue;
      if (!name && FRAMEWORK_DIRS.has(entry)) continue;
      const child = name ? `${name}/${entry}` : entry;
      const readme = join(path, 'README.md');
      if (existsSync(readme))
        folders.push({
          name: child,
          dir: path,
          readme: true,
          scope: scopeOf(readFileSync(readme, 'utf8')),
        });
      else if (!name)
        folders.push({ name: child, dir: path, readme: false, scope: null });
      walk(path, child);
    }
  };
  if (existsSync(specDir)) walk(specDir, '');
  return folders.sort((a, b) =>
    a.name < b.name ? -1 : a.name > b.name ? 1 : 0
  );
};

/** Every vertical under `specDir`: the folders that declare a scope. */
export const specVerticals = specDir =>
  specFolders(specDir).filter(folder => folder.scope !== null);

/**
 * A problem for each stem two or more verticals share, such as
 * `procurement/plan` and a top-level `procurement-plan`: they would share one
 * src/sections/ folder, e2e suite and exploratory workflow.
 */
export const stemClashes = verticals => {
  const byStem = new Map();
  for (const { name } of verticals)
    byStem.set(stem(name), [...(byStem.get(stem(name)) ?? []), name]);
  return [...byStem]
    .filter(([, names]) => names.length > 1)
    .map(
      ([shared, names]) =>
        `${names.join(' and ')} share the stem ${shared}, so they would share one src/sections/ folder, e2e suite and workflow`
    );
};
