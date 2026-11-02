/*
 * Full-stack spec check — IMPLEMENTING.md C9 and C10.
 *
 * A full-stack vertical (its README opens with `> **Scope: full stack.**`)
 * describes the server in its contract.md, and two of those sections must stay
 * true to the code:
 *
 *   C10  Proposed API is SDL for what the server doesn't export yet. Once
 *        server/schema.graphql has a name, its block is deleted, so a proposed
 *        name that is also in the schema fails — the copy would drift.
 *   C9   Data lists every table the vertical owns. Each table the server's code
 *        already defines (a diesel `table!` block under server/repository/src)
 *        must have the same columns, each nullable or not as stated. A table
 *        the code doesn't have yet is listed as not built, without failing.
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

/** A `## <title>` section's body, up to the next `##` outside a code fence. */
export const section = (markdown, title) => {
  const lines = markdown.split('\n');
  let inFence = false;
  let start = -1;
  const body = [];
  for (const line of lines) {
    if (line.startsWith('```')) inFence = !inFence;
    if (!inFence && line.startsWith('## ')) {
      if (start >= 0) break;
      if (line.slice(3).trim() === title) {
        start = 0;
        continue;
      }
    }
    if (start >= 0) body.push(line);
  }
  return start >= 0 ? body.join('\n') : null;
};

const graphqlBlocks = markdown =>
  [...markdown.matchAll(/^```graphql\n([\s\S]*?)^```/gm)].map(m => m[1]);

const DEFINITION =
  /^\s*(extend\s+)?(type|input|enum|union|interface|scalar)\s+([A-Za-z_]\w*)/gm;

/** Field names declared directly inside `{ … }` of a type body. */
const topLevelFields = body => {
  const fields = [];
  let parens = 0;
  for (const m of body.matchAll(/[A-Za-z_]\w*|[()]/g)) {
    if (m[0] === '(') parens++;
    else if (m[0] === ')') parens--;
    else if (parens === 0) {
      const after = body.slice(m.index + m[0].length).trimStart();
      if (after.startsWith('(') || after.startsWith(':')) fields.push(m[0]);
    }
  }
  return fields;
};

/** Names a type body opened at `index` declares, up to its matching brace. */
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

/**
 * What an SDL text declares: the names of the types it defines, and the
 * fields it adds to each root (`Queries`, `Mutations`), whether by `type` or
 * `extend type`.
 */
export const sdlNames = source => {
  // Descriptions are prose: a word followed by a colon there isn't a field.
  const sdl = source.replace(/"""[\s\S]*?"""|"(?:[^"\\\n]|\\.)*"/g, '');
  const types = new Set();
  const roots = { Queries: new Set(), Mutations: new Set() };
  for (const m of sdl.matchAll(DEFINITION)) {
    const [, extend, , name] = m;
    if (name in roots) {
      for (const f of topLevelFields(bodyAt(sdl, m.index))) roots[name].add(f);
    } else if (!extend) {
      types.add(name);
    }
  }
  return { types, roots };
};

/** Proposed names already in the schema: each one is a C10 failure. */
export const exportedProposals = (proposedSdl, schemaSdl) => {
  const proposed = sdlNames(proposedSdl);
  const schema = sdlNames(schemaSdl);
  const found = [...proposed.types].filter(t => schema.types.has(t));
  for (const root of Object.keys(proposed.roots))
    for (const f of proposed.roots[root])
      if (schema.roots[root].has(f)) found.push(`${root}.${f}`);
  return found;
};

const cells = row =>
  row
    .trim()
    .replace(/^\||\|$/g, '')
    .split('|')
    .map(c => c.trim());

const unquote = text => text.replace(/`/g, '').trim();

/**
 * The tables a Data section lists: a `### name` heading for each, then a
 * markdown table with Column and Null headers.
 * Returns name → column → nullable.
 */
export const dataTables = sectionText => {
  const tables = new Map();
  let current = null;
  let header = null;
  for (const line of sectionText.split('\n')) {
    if (line.startsWith('### ')) {
      current = new Map();
      tables.set(unquote(line.slice(4)), current);
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
    const column = unquote(row[header.indexOf('column')] ?? '');
    const isNull = (row[header.indexOf('null')] ?? '').toLowerCase();
    if (column) current.set(column, isNull === 'yes');
  }
  return tables;
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
export const check = ({ specDir, schemaPath, repositoryDir }) => {
  const verticals = readdirSync(specDir)
    .filter(name => existsSync(join(specDir, name, 'README.md')))
    .filter(name =>
      isFullStack(readFileSync(join(specDir, name, 'README.md'), 'utf8'))
    )
    .sort();
  const problems = [];
  const notBuilt = [];
  let tablesChecked = 0;
  if (verticals.length === 0)
    return { verticals, problems, notBuilt, tablesChecked };

  const schema = readFileSync(schemaPath, 'utf8');
  const code = new Map();
  for (const file of rustFiles(repositoryDir))
    for (const [name, columns] of codeTables(readFileSync(file, 'utf8')))
      if (columns.size > (code.get(name)?.size ?? -1)) code.set(name, columns);

  for (const vertical of verticals) {
    const contractPath = join(specDir, vertical, 'contract.md');
    if (!existsSync(contractPath)) {
      problems.push(`${vertical}: full stack, but has no contract.md`);
      continue;
    }
    const contract = readFileSync(contractPath, 'utf8');

    const proposed = section(contract, 'Proposed API');
    if (proposed !== null)
      for (const name of exportedProposals(
        graphqlBlocks(proposed).join('\n'),
        schema
      ))
        problems.push(
          `${vertical}: Proposed API still declares ${name}, which schema.graphql exports — delete its block (C10)`
        );

    const data = section(contract, 'Data');
    if (data === null) {
      problems.push(
        `${vertical}: full stack, but contract.md has no Data section`
      );
      continue;
    }
    for (const [table, columns] of dataTables(data)) {
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
      for (const column of built.keys())
        if (!columns.has(column))
          problems.push(
            `${vertical}: ${table}.${column} is in the code but not the spec (C9)`
          );
    }
  }
  return { verticals, problems, notBuilt, tablesChecked };
};

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  // The spec isn't published to the public mirror; nothing to check there.
  if (!existsSync('../spec')) {
    console.log('full-stack spec skipped — no spec/ in this tree');
    process.exit(0);
  }
  const { verticals, problems, notBuilt, tablesChecked } = check({
    specDir: '../spec',
    schemaPath: '../server/schema.graphql',
    repositoryDir: '../server/repository/src',
  });
  if (problems.length > 0) {
    console.error(
      `Full-stack spec out of step with the server:\n  ${problems.join('\n  ')}`
    );
    console.error('\nSee spec/AUTHORING.md → The back-end sections.');
    process.exit(1);
  }
  console.log(
    verticals.length === 0
      ? 'full-stack spec OK — no full-stack verticals'
      : `full-stack spec OK — ${verticals.length} vertical(s), ${tablesChecked} table(s) match the code` +
          (notBuilt.length > 0 ? `; not built yet: ${notBuilt.join(', ')}` : '')
  );
}
