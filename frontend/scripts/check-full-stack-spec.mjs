/*
 * Full-stack spec check — IMPLEMENTING.md C9.
 *
 * A full-stack vertical (its README opens with `> **Scope: full stack.**`)
 * decides its tables in data.md, and the server's code must match:
 *
 *   C9   Each table the server's code already defines (a diesel `table!` block
 *        under server/repository/src) has the same columns as data.md, each
 *        nullable or not as stated. For a table the vertical only extends
 *        (`(existing)` on its heading), data.md lists just the columns the
 *        vertical adds, and only those are compared. A table the code doesn't
 *        have yet is listed as not built, without failing.
 *
 * A full-stack vertical has no contract.md: the builder designs the API from
 * the rules, and the exported schema records it. One that still has a
 * contract.md fails, so a half-converted vertical can't pass.
 *
 * The check doesn't ask the spec to be complete — a spec is written in stages,
 * and one with no data.md yet is listed, not failed. Completeness is
 * AUTHORING.md's definition of done.
 *
 * Plain Node, no dependencies: server CI runs it too, without an install, so
 * a server change that drifts from a spec fails there and not only on the
 * next front-end PR.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const FULL_STACK_LINE = /^> \*\*Scope: full stack\.\*\* /;

/** Whether a README opens with the full-stack scope line under its heading. */
export const isFullStack = readme => {
  const [heading, ...rest] = readme.split('\n');
  const first = rest.find(line => line.trim() !== '') ?? '';
  return heading.startsWith('# ') && FULL_STACK_LINE.test(first);
};

const cells = row =>
  row
    .trim()
    .replace(/^\||\|$/g, '')
    .split('|')
    .map(c => c.trim());

const unquote = text => text.replace(/`/g, '').trim();

const TABLE_HEADING = /^## `(\w+)`(.*)$/;

/**
 * The tables a data.md decides: a `` ## `name` `` heading for each, ending
 * `(existing)` for a table the vertical only extends, then a markdown table
 * with Column and Null headers. Any other `##` heading (Permissions) ends the
 * table before it.
 * Returns name → { existing, columns: column → nullable }.
 */
export const dataTables = markdown => {
  const tables = new Map();
  let current = null;
  let header = null;
  for (const line of markdown.split('\n')) {
    if (line.startsWith('## ')) {
      const m = TABLE_HEADING.exec(line);
      current = m
        ? { existing: /\(existing\)/.test(m[2]), columns: new Map() }
        : null;
      if (m) tables.set(m[1], current);
      header = null;
      continue;
    }
    if (!current || !line.trim().startsWith('|')) {
      if (line.trim() !== '') header = null;
      continue;
    }
    const row = cells(line);
    if (!header) {
      header = row.map(h => h.toLowerCase());
      continue;
    }
    if (row.every(c => /^:?-+:?$/.test(c))) continue;
    if (!header.includes('column')) continue;
    const column = unquote(row[header.indexOf('column')] ?? '');
    const isNull = (row[header.indexOf('null')] ?? '').toLowerCase();
    if (column) current.columns.set(column, isNull === 'yes');
  }
  return tables;
};

/** The text inside the first `{ … }` at or after `index`, braces balanced. */
const bodyAt = (text, index) => {
  const open = text.indexOf('{', index);
  if (open < 0) return '';
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}' && --depth === 0) return text.slice(open + 1, i);
  }
  return text.slice(open + 1);
};

const COLUMN = /(?:#\[sql_name\s*=\s*"(\w+)"\]\s*)?(\w+)\s*->\s*([^,\n]+)/g;

const columnsOf = body =>
  new Map(
    [...body.matchAll(COLUMN)].map(c => [
      c[1] ?? c[2],
      /^Nullable\s*</.test(c[3].trim()),
    ])
  );

/** The `<key>: { … }` block inside a macro body, or '' when it has none. */
const block = (body, key) => {
  const m = new RegExp(`\\b${key}\\s*:\\s*\\{`).exec(body);
  return m ? bodyAt(body, m.index) : '';
};

/**
 * The tables some Rust source defines, as stored: name → column → nullable.
 * Reads diesel's `table!` (with `#[sql_name = "…"]` on a table or column), and
 * the repository's `define_linked_tables!`, whose stored table is its `core`
 * one: an implicit `id`, the `shared` columns, and a link column per `links`
 * (not null) and `optional_links` (nullable) entry.
 */
export const codeTables = source => {
  // Comments hold examples of both macros that define nothing.
  const rust = source.replace(/\/\/.*$/gm, '');
  const tables = new Map();
  const keep = (name, columns) => {
    if (columns.size > (tables.get(name)?.size ?? -1))
      tables.set(name, columns);
  };
  for (const m of rust.matchAll(/\btable!\s*\{/g)) {
    const body = bodyAt(rust, m.index);
    const head =
      /(?:#\[sql_name\s*=\s*"(\w+)"\]\s*)?(\$?\w+)\s*\([^)]*\)\s*\{/.exec(body);
    // A `$name` is a macro's own template, not a table.
    if (head && !head[2].startsWith('$'))
      keep(head[1] ?? head[2], columnsOf(bodyAt(body, head.index)));
  }
  for (const m of rust.matchAll(/\bdefine_linked_tables!\s*\{/g)) {
    const body = bodyAt(rust, m.index);
    const core = /\bcore\s*:\s*\w+\s*=\s*"(\w+)"/.exec(body);
    if (!core) continue;
    const columns = new Map([['id', false]]);
    for (const [name, nullable] of columnsOf(block(body, 'shared')))
      columns.set(name, nullable);
    for (const [key, nullable] of [
      ['links', false],
      ['optional_links', true],
    ])
      for (const l of block(body, key).matchAll(/(\w+)\s*->\s*\w+/g))
        columns.set(l[1], nullable);
    keep(core[1], columns);
  }
  return tables;
};

// Migrations redeclare a table with only the columns they touch, as it was at
// that point in history; the current definition is the repository's own.
const rustFiles = dir =>
  !existsSync(dir)
    ? []
    : readdirSync(dir).flatMap(name => {
        const path = join(dir, name);
        if (statSync(path).isDirectory())
          return name === 'migrations' ? [] : rustFiles(path);
        return name.endsWith('.rs') ? [path] : [];
      });

/** Every problem across the full-stack verticals in `specDir`. */
export const check = ({ specDir, repositoryDir }) => {
  const verticals = readdirSync(specDir)
    .filter(name => existsSync(join(specDir, name, 'README.md')))
    .filter(name =>
      isFullStack(readFileSync(join(specDir, name, 'README.md'), 'utf8'))
    )
    .sort();
  const problems = [];
  const notBuilt = [];
  const noData = [];
  let tablesChecked = 0;
  if (verticals.length === 0)
    return { verticals, problems, notBuilt, noData, tablesChecked };

  const code = new Map();
  for (const file of rustFiles(repositoryDir))
    for (const [name, columns] of codeTables(readFileSync(file, 'utf8')))
      if (columns.size > (code.get(name)?.size ?? -1)) code.set(name, columns);

  for (const vertical of verticals) {
    if (existsSync(join(specDir, vertical, 'contract.md')))
      problems.push(
        `${vertical}: a full-stack vertical has no contract.md — its tables go in data.md`
      );
    const dataPath = join(specDir, vertical, 'data.md');
    if (!existsSync(dataPath)) {
      noData.push(vertical);
      continue;
    }
    for (const [table, { existing, columns }] of dataTables(
      readFileSync(dataPath, 'utf8')
    )) {
      const built = code.get(table);
      if (!built) {
        notBuilt.push(`${vertical}: ${table}`);
        continue;
      }
      tablesChecked++;
      for (const [column, nullable] of columns) {
        if (!built.has(column))
          problems.push(
            `${vertical}: ${table}.${column} is in the spec but not the code (C9)`
          );
        else if (built.get(column) !== nullable)
          problems.push(
            `${vertical}: ${table}.${column} is ${nullable ? 'nullable' : 'not nullable'} in the spec but ${built.get(column) ? 'nullable' : 'not nullable'} in the code (C9)`
          );
      }
      if (existing) continue;
      for (const column of built.keys())
        if (!columns.has(column))
          problems.push(
            `${vertical}: ${table}.${column} is in the code but not the spec (C9)`
          );
    }
  }
  return { verticals, problems, notBuilt, noData, tablesChecked };
};

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  // The spec isn't published to the public mirror; nothing to check there.
  if (!existsSync('../spec')) {
    console.log('full-stack spec skipped — no spec/ in this tree');
    process.exit(0);
  }
  const { verticals, problems, notBuilt, noData, tablesChecked } = check({
    specDir: '../spec',
    repositoryDir: '../server/repository/src',
  });
  if (problems.length > 0) {
    console.error(
      `Full-stack spec out of step with the server:\n  ${problems.join('\n  ')}`
    );
    console.error('\nSee spec/AUTHORING.md → data.md.');
    process.exit(1);
  }
  console.log(
    verticals.length === 0
      ? 'full-stack spec OK — no full-stack verticals'
      : `full-stack spec OK — ${verticals.length} vertical(s), ${tablesChecked} table(s) match the code` +
          (notBuilt.length > 0
            ? `; not built yet: ${notBuilt.join(', ')}`
            : '') +
          (noData.length > 0 ? `; no data.md yet: ${noData.join(', ')}` : '')
  );
}
