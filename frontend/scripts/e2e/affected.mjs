#!/usr/bin/env node
/*
 * Which e2e suites does this change put at risk?
 *
 *   pnpm e2e:affected                    # vs merge-base with origin/develop
 *   pnpm e2e:affected --base origin/v3.2 # another base
 *   pnpm e2e:affected --files a.ts b.rs  # explicit paths (cwd- or repo-rel.)
 *   pnpm e2e:affected --run [-- <pw args>]   # run the selection locally
 *   pnpm e2e:affected --run --force      # …without skipping known-green ones
 *   pnpm e2e:affected --status           # which still need a run (exit 3)
 *   node scripts/e2e/affected.mjs --push-hook
 *                                        # the same, as a warn-only PreToolUse
 *                                        # hook (.claude/settings.json)
 *   pnpm e2e:affected --json             # machine-readable (CI)
 *   pnpm e2e:affected --list             # suite names only, one per line
 *   pnpm e2e:affected --check            # lint the config (in `pnpm check`)
 *
 * The small amount of configuration, and the reasoning behind what is
 * derived instead, live in e2e/affected.config.mjs. In short: front-end
 * changes are walked up the runtime import graph to the screens that reach
 * them; server changes are followed through the GraphQL seam (service module
 * → resolver → root field → front-end document → screen); anything neither
 * can place runs smoke and is named, so the config gets extended rather than
 * silently selecting nothing.
 *
 * "Changed" is everything a reviewer would see: committed since the
 * merge-base, staged, unstaged, and untracked — an agent asks this before it
 * commits, not after.
 *
 * `--run` records which suites went green, against a snapshot of every file
 * a suite can see (e2e/.affected-green.json, per worktree). The next `--run`
 * skips a suite that was green and that nothing visible since reaches — so
 * an agent's check before "done" is not repeated by pr-create, a docs-only
 * commit costs nothing, and a one-line fix re-runs only what it touches.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const posix = path.posix;
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const FE_DIR = path.resolve(SCRIPT_DIR, '../..');

// --- Matching -----------------------------------------------------------

// node:path's matchesGlob recompiles the pattern on every call — ~350 globs
// × ~10k files made `--check` take 20s. Compile once; `*`, `**`, `?` only.
const globCache = new Map();
export const compileGlob = glob => {
  let re = globCache.get(glob);
  if (re) return re;
  let src = '^';
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === '*' && glob[i + 1] === '*') {
      if (glob[i + 2] === '/') {
        src += '(?:.*/)?';
        i += 2;
      } else {
        src += '.*';
        i += 1;
      }
    } else if (c === '*') src += '[^/]*';
    else if (c === '?') src += '[^/]';
    else src += c.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  }
  re = new RegExp(`${src}$`);
  globCache.set(glob, re);
  return re;
};
export const matchesGlob = (file, glob) => compileGlob(glob).test(file);
const matchesAny = (file, globs) => globs.some(g => matchesGlob(file, g));

// --- Owners: suites and uncovered sections, by convention -------------------

const SPEC = /^frontend\/e2e\/specs\/([^/]+)\.spec\.ts$/;
const SECTION = /^frontend\/src\/sections\/([^/]+)\//;
const specNames = files =>
  [...files]
    .map(f => SPEC.exec(f)?.[1])
    .filter(Boolean)
    .sort();
const sectionNames = files =>
  [
    ...new Set([...files].map(f => SECTION.exec(f)?.[1]).filter(Boolean)),
  ].sort();

// Plugin profiles (e2e/README.md § Plugin profiles): a suite under
// specs/plugins/<profile>/ runs on its own stack with that plugin installed,
// never on the default one. A profile counts only when
// plugins/<profile>/package.json exists — the nightly's rule.
const PROFILE_SPEC =
  /^frontend\/e2e\/specs\/plugins\/([^/]+)\/([^/]+)\.spec\.ts$/;
export const profileSuites = files =>
  [...files]
    .map(f => PROFILE_SPEC.exec(f))
    .filter(Boolean)
    .map(([spec, profile, name]) => ({ name, profile, spec }))
    .filter(s => files.has(`frontend/plugins/${s.profile}/package.json`))
    .sort((a, b) => a.name.localeCompare(b.name));
const allSuiteNames = files =>
  [...specNames(files), ...profileSuites(files).map(s => s.name)].sort();
const PLUGIN_DIR = /^frontend\/plugins\/([^/]+)\//;

/**
 * The config as selection uses it: a plugin with no profile is ignored —
 * no stack loads it, so no suite can observe it. Adding a profile is just
 * its specs/plugins/<profile>/ directory; nothing to list here.
 */
export const effectiveConfig = (config, files) => {
  const profiles = new Set(profileSuites(files).map(s => s.profile));
  const unloaded = new Set(
    [...files]
      .map(f => PLUGIN_DIR.exec(f)?.[1])
      .filter(d => d && !profiles.has(d))
  );
  return {
    ...config,
    ignore: [
      ...config.ignore,
      ...[...unloaded].map(d => `frontend/plugins/${d}/**`),
    ],
  };
};

/**
 * `<name>-regression.spec.ts` owns `frontend/src/sections/<name>/**` unless
 * config.overrides says otherwise. A suite also owns its spec file, so an
 * edit to the spec (or to a helper only it imports) selects it through the
 * same graph walk. A section no suite owns is an `uncovered` owner: the graph
 * treats it as a boundary, so a change to items/ is reported as "no e2e
 * coverage for items" rather than walking on up to the app shell.
 */
export const ownersOf = (config, files) => {
  const owners = [];
  for (const name of specNames(files)) {
    const frontend = config.overrides[name] ?? [
      `frontend/src/sections/${name.replace(/-regression$/, '')}/**`,
    ];
    owners.push({
      name,
      kind: 'suite',
      frontend: [...frontend, `frontend/e2e/specs/${name}.spec.ts`],
    });
  }
  // A profile suite owns its plugin and the host's plugin loader; a change to
  // the SDK reaches it through the plugin's own imports.
  for (const s of profileSuites(files))
    owners.push({
      name: s.name,
      kind: 'suite',
      profile: s.profile,
      frontend: [
        `frontend/plugins/${s.profile}/**`,
        'frontend/src/plugins/**',
        s.spec,
      ],
    });
  for (const section of sectionNames(files)) {
    const probe = `frontend/src/sections/${section}/index.tsx`;
    if (!owners.some(o => matchesAny(probe, o.frontend)))
      owners.push({
        name: section,
        kind: 'uncovered',
        frontend: [`frontend/src/sections/${section}/**`],
      });
  }
  return owners;
};

const frontendOwners = (owners, file) =>
  owners.filter(o => matchesAny(file, o.frontend));

// --- Front-end import graph ----------------------------------------------

const CODE = /\.(tsx?|jsx?|mjs|cjs)$/;
const RESOLVE_EXTS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json'];
const inGraph = f =>
  f.startsWith('frontend/src/') ||
  f.startsWith('frontend/e2e/') ||
  f.startsWith('frontend/plugins/');

/**
 * Resolve an import specifier to a repo-relative file in `files`, or null for
 * a package. Mirrors the `@/` and plugin-sdk aliases in vite.config.ts.
 */
export const resolveSpecifier = (from, spec, files) => {
  let base;
  const bare = spec.replace(/\?.*$/, '');
  if (bare === '@openmsupply/plugin-sdk')
    return 'frontend/src/plugin-sdk/index.ts';
  if (bare.startsWith('@/')) base = `frontend/src/${bare.slice(2)}`;
  else if (bare.startsWith('.')) base = posix.join(posix.dirname(from), bare);
  else return null;
  const candidates = [
    base,
    ...RESOLVE_EXTS.map(e => base + e),
    // ESM-style `./x.js` naming a `./x.ts` source.
    ...(/\.jsx?$/.test(base)
      ? ['.ts', '.tsx'].map(e => base.replace(/\.jsx?$/, e))
      : []),
    ...RESOLVE_EXTS.map(e => `${base}/index${e}`),
  ];
  return candidates.find(c => files.has(c)) ?? null;
};

/**
 * The RUNTIME imports of one source file. `import type` / `export type` are
 * dropped: verbatimModuleSyntax erases exactly those, so they cannot change
 * behaviour. A mixed `import { type A, b }` stays — it still loads the module.
 * Beyond static imports: `import('…')` (including template paths, as a prefix
 * match), `import.meta.glob('…')`, and `new URL('…', import.meta.url)`.
 */
export const runtimeImports = (ts, from, source, files) => {
  const sf = ts.createSourceFile(from, source, ts.ScriptTarget.Latest, false);
  const out = new Set();
  const add = spec => {
    const r = resolveSpecifier(from, spec, files);
    if (r) out.add(r);
  };
  const isImportMeta = n =>
    n && ts.isMetaProperty(n) && n.keywordToken === ts.SyntaxKind.ImportKeyword;
  const visit = node => {
    if (ts.isImportDeclaration(node)) {
      if (
        !node.importClause?.isTypeOnly &&
        ts.isStringLiteral(node.moduleSpecifier)
      )
        add(node.moduleSpecifier.text);
    } else if (ts.isExportDeclaration(node)) {
      if (
        !node.isTypeOnly &&
        node.moduleSpecifier &&
        ts.isStringLiteral(node.moduleSpecifier)
      )
        add(node.moduleSpecifier.text);
    } else if (ts.isCallExpression(node)) {
      const [arg] = node.arguments;
      if (node.expression.kind === ts.SyntaxKind.ImportKeyword && arg) {
        if (ts.isStringLiteralLike(arg)) add(arg.text);
        else if (ts.isTemplateExpression(arg)) {
          // `./locales/${locale}/common.json` → every file under ./locales/
          // ending in /common.json.
          const head = arg.head.text;
          const tail = arg.templateSpans.at(-1).literal.text;
          if (head.startsWith('.') || head.startsWith('@/')) {
            const dir = head.startsWith('@/')
              ? `frontend/src/${head.slice(2)}`
              : posix.join(posix.dirname(from), head);
            for (const f of files)
              if (f.startsWith(dir) && f.endsWith(tail)) out.add(f);
          }
        }
      } else if (
        ts.isPropertyAccessExpression(node.expression) &&
        node.expression.name.text === 'glob' &&
        isImportMeta(node.expression.expression) &&
        arg
      ) {
        const patterns = ts.isArrayLiteralExpression(arg)
          ? arg.elements
          : [arg];
        for (const p of patterns) {
          if (!ts.isStringLiteralLike(p)) continue;
          const g = p.text.startsWith('/')
            ? `frontend${p.text}`
            : posix.join(posix.dirname(from), p.text);
          for (const f of files) if (matchesGlob(f, g)) out.add(f);
        }
      }
    } else if (
      ts.isNewExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === 'URL' &&
      node.arguments?.length === 2 &&
      ts.isStringLiteralLike(node.arguments[0]) &&
      ts.isPropertyAccessExpression(node.arguments[1]) &&
      isImportMeta(node.arguments[1].expression)
    ) {
      add(node.arguments[0].text);
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  out.delete(from);
  return out;
};

/** importer lists keyed by imported file: the graph, reversed. */
export const buildImporters = (ts, files, read) => {
  const importers = new Map();
  for (const from of files) {
    if (!inGraph(from) || !CODE.test(from) || from.endsWith('.d.ts')) continue;
    for (const to of runtimeImports(ts, from, read(from), files)) {
      if (!importers.has(to)) importers.set(to, []);
      importers.get(to).push(from);
    }
  }
  return importers;
};

const ENTRY = 'frontend/src/index.tsx';

/**
 * Walk up from a changed front-end file. Every owned file reached charges its
 * owner, at the hop count of the first (shortest) path. Two walks, because
 * they answer different questions:
 *   - the full walk continues through owned files — a vertical that imports
 *     another vertical's component is at risk from it too;
 *   - the shell walk stops at owned files and asks whether the app entry is
 *     still reachable — code the shell uses directly, outside every screen.
 */
export const walkFrontend = (file, importers, owners, ignore) => {
  const hits = new Map(); // owner name → { owner, distance, chain }
  const parent = new Map([[file, null]]);
  const queue = [[file, 0]];
  const chainTo = f => {
    const chain = [];
    for (let at = f; at !== null; at = parent.get(at)) chain.unshift(at);
    return chain;
  };
  while (queue.length) {
    const [at, d] = queue.shift();
    for (const o of frontendOwners(owners, at)) {
      if (!hits.has(o.name))
        hits.set(o.name, { owner: o, distance: d, chain: chainTo(at) });
    }
    for (const up of importers.get(at) ?? []) {
      if (parent.has(up) || matchesAny(up, ignore)) continue;
      parent.set(up, at);
      // A shared module's index.ts is its curated surface, not a layer:
      // passing through one costs no hop, so `@/domain/x` reads as one import
      // away. A vertical's own index.tsx is a screen, and does cost one.
      // (Queued at the back regardless, so distances are approximate.)
      const barrel =
        /\/index\.[jt]sx?$/.test(up) && !frontendOwners(owners, up).length;
      queue.push([up, barrel ? d : d + 1]);
    }
  }

  let shell = false;
  const seen = new Set([file]);
  const stack = frontendOwners(owners, file).length ? [] : [file];
  while (stack.length && !shell) {
    const at = stack.pop();
    if (at === ENTRY) shell = true;
    for (const up of importers.get(at) ?? []) {
      if (seen.has(up) || matchesAny(up, ignore)) continue;
      seen.add(up);
      if (!frontendOwners(owners, up).length) stack.push(up);
    }
  }
  return { hits: [...hits.values()], shell };
};

// --- Server: derived through the GraphQL seam -------------------------------

const SERVICE_SRC = 'server/service/src/';
const SERVICE_MODULE = /^server\/service\/src\/([a-z0-9_]+)/;
const GRAPHQL_FILE = /^server\/graphql\/([^/]+)\/.*\.rs$/;
const REPOSITORY_SRC = 'server/repository/src/';
const RUST_TEST = /(^|\/)tests?\/|tests?\.rs$|_tests?\.rs$/;

/**
 * Top-level segments after `<root>::` in Rust source — `crate::stock_line`,
 * and every entry of a grouped `use crate::{ invoice::X, stock_line::{a, b} }`.
 * Grouped imports are the common form (400+ files), so a plain
 * `/crate::(\w+)/` misses most edges.
 */
export const rustRefs = (src, root) => {
  const out = new Set();
  const re = new RegExp(`\\b${root}::(\\{|[A-Za-z_][A-Za-z0-9_]*)`, 'g');
  for (const m of src.matchAll(re)) {
    if (m[1] !== '{') {
      out.add(m[1]);
      continue;
    }
    let i = m.index + m[0].length;
    let depth = 1;
    let tok = '';
    let atTop = true; // false once past a `::` or inside a nested group
    while (i < src.length && depth) {
      const c = src[i++];
      if (c === '{') {
        depth++;
        continue;
      }
      if (c === '}') {
        depth--;
        if (depth === 1) atTop = true;
        continue;
      }
      if (depth !== 1) continue;
      if (/[A-Za-z0-9_]/.test(c)) {
        if (atTop) tok += c;
      } else {
        if (tok) out.add(tok);
        tok = '';
        if (c === ':') atTop = false;
        if (c === ',') atTop = true;
      }
    }
    if (tok) out.add(tok);
  }
  out.delete('self');
  out.delete('super');
  return out;
};

const camel = s => s.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());

/** `async fn name(...) { body }` pairs in a Rust source, tests excluded. */
const asyncFns = src => {
  const out = [];
  for (const m of src.matchAll(/\basync fn ([a-z_][a-z0-9_]*)\s*\(/g)) {
    if (m[1].startsWith('test')) continue;
    let i = m.index + m[0].length;
    let depth = 1;
    while (i < src.length && depth) {
      const c = src[i++];
      if (c === '(') depth++;
      else if (c === ')') depth--;
    }
    while (i < src.length && src[i] !== '{' && src[i] !== ';') i++;
    if (src[i] !== '{') continue;
    const start = i;
    depth = 0;
    do {
      const c = src[i++];
      if (c === '{') depth++;
      else if (c === '}') depth--;
    } while (i < src.length && depth);
    out.push({ name: m[1], body: src.slice(start, i) });
  }
  return out;
};

/**
 * Everything the server side needs, built once from the tree:
 *
 *   service module ─(use service::m | service_provider.m_service)─▶ resolver
 *   resolver ─(impl XQueries { async fn f })─▶ root field `f`
 *   root field ◀─(query { f })─ frontend .graphql document
 *   document ─(sibling .generated.ts, import graph)─▶ suites
 *
 * plus repository file ─(pub struct/enum/trait names it defines)─▶ service
 * modules, and one hop of `crate::m` inside the service crate. Modules (and
 * repository files) referenced by more than half of the resolvers (or
 * service modules) are plumbing — `all`'s job, not an edge.
 */
export const buildServerIndex = (
  gqlParse,
  { config, files, read, importers, owners }
) => {
  const isCode = f => f.endsWith('.rs') && !RUST_TEST.test(f);
  const moduleOf = f => SERVICE_MODULE.exec(f)?.[1];
  const serviceFiles = [...files].filter(
    f => f.startsWith(SERVICE_SRC) && isCode(f)
  );
  const serviceMods = new Set(serviceFiles.map(moduleOf));
  const gqlFiles = [...files].filter(
    f =>
      GRAPHQL_FILE.test(f) &&
      isCode(f) &&
      !/^server\/graphql\/(core|types)\//.test(f)
  );
  const crateOf = f => GRAPHQL_FILE.exec(f)[1];

  // repository: the public names each file defines
  const repoFiles = [...files].filter(
    f =>
      f.startsWith(REPOSITORY_SRC) &&
      isCode(f) &&
      !matchesAny(f, config.all) &&
      !matchesAny(f, config.ignore)
  );
  const repoByName = new Map();
  for (const f of repoFiles) {
    const seg = f
      .slice(REPOSITORY_SRC.length)
      .replace(/^db_diesel\//, '')
      .replace(/\.rs$/, '')
      .split('/')[0];
    const names = [
      seg,
      ...[...read(f).matchAll(/\bpub (?:struct|enum|type|trait) (\w+)/g)].map(
        m => m[1]
      ),
    ];
    for (const n of names) {
      if (!repoByName.has(n)) repoByName.set(n, new Set());
      repoByName.get(n).add(f);
    }
  }
  const repoFilesFor = refs => {
    const out = new Set();
    for (const n of refs) for (const f of repoByName.get(n) ?? []) out.add(f);
    return out;
  };

  // service_provider.rs: `pub name_service: Box<dyn NameServiceTrait>` →
  // the module that defines `pub trait NameServiceTrait`.
  const traitToMod = new Map();
  for (const f of serviceFiles)
    for (const m of read(f).matchAll(/\bpub trait (\w+)/g))
      traitToMod.set(m[1], moduleOf(f));
  const providerField = new Map();
  const provider = `${SERVICE_SRC}service_provider.rs`;
  if (files.has(provider))
    for (const m of read(provider).matchAll(/\bpub (\w+): Box<dyn (\w+)>/g))
      if (traitToMod.has(m[2])) providerField.set(m[1], traitToMod.get(m[2]));
  const serviceRefs = src => {
    const out = new Set(
      [...rustRefs(src, 'service')].filter(m => serviceMods.has(m))
    );
    for (const m of src.matchAll(/\.(\w+_service)\b/g))
      if (providerField.has(m[1])) out.add(providerField.get(m[1]));
    return out;
  };

  // inside the service crate: module → modules referencing crate::<it>;
  // repository file → service modules using something it defines
  const serviceHop = new Map();
  const repoToService = new Map();
  for (const f of serviceFiles) {
    const own = moduleOf(f);
    const src = read(f);
    for (const m of rustRefs(src, 'crate')) {
      if (m === own || !serviceMods.has(m)) continue;
      if (!serviceHop.has(m)) serviceHop.set(m, new Set());
      serviceHop.get(m).add(own);
    }
    for (const rf of repoFilesFor(rustRefs(src, 'repository'))) {
      if (!repoToService.has(rf)) repoToService.set(rf, new Set());
      repoToService.get(rf).add(own);
    }
  }

  // resolvers: each file's service and repository references
  const gqlService = new Map();
  const gqlRepo = new Map();
  for (const f of gqlFiles) {
    const src = read(f);
    gqlService.set(f, serviceRefs(src));
    gqlRepo.set(f, repoFilesFor(rustRefs(src, 'repository')));
  }

  // plumbing: referenced by more than half of the resolvers / service modules
  const plumbing = new Set();
  const refCount = new Map();
  for (const refs of gqlService.values())
    for (const m of refs) refCount.set(m, (refCount.get(m) ?? 0) + 1);
  for (const [m, n] of refCount) if (n > gqlFiles.length / 2) plumbing.add(m);
  const plumbingRepo = new Set();
  for (const [rf, mods] of repoToService)
    if (mods.size > serviceMods.size / 2) plumbingRepo.add(rf);

  // root fields: `async fn`s in files holding `impl XQueries/XMutations`,
  // with the free functions the body calls resolved to the crate file that
  // defines each (only when exactly one does — shared helper names such as
  // `map_response` exist in every batch_mutations file).
  const fnDefs = new Map(); // crate → name → Set(file)
  for (const f of gqlFiles) {
    const c = crateOf(f);
    if (!fnDefs.has(c)) fnDefs.set(c, new Map());
    for (const m of read(f).matchAll(
      /\bpub (?:async )?fn ([a-z_][a-z0-9_]*)/g
    )) {
      if (!fnDefs.get(c).has(m[1])) fnDefs.get(c).set(m[1], new Set());
      fnDefs.get(c).get(m[1]).add(f);
    }
  }
  const fieldDeps = new Map(); // camelCase field → { svc, repo, files }
  const fileFields = new Map(); // resolver file → fields it serves
  const rootFileFields = new Map(); // root impl file → fields it defines
  for (const f of gqlFiles) {
    const src = read(f);
    if (!/\bimpl \w+(Queries|Mutations|Subscriptions)\b/.test(src)) continue;
    const crate = crateOf(f);
    rootFileFields.set(f, new Set());
    for (const { name, body } of asyncFns(src)) {
      rootFileFields.get(f).add(camel(name));
      const served = new Set();
      // general is a grab-bag: its lib.rs's own imports say nothing about
      // one field. Elsewhere the root file is the resolver.
      if (crate !== 'general') served.add(f);
      for (const m of body.matchAll(/\b([a-z_][a-z0-9_]*)\s*\(/g)) {
        const defs = [...(fnDefs.get(crate).get(m[1]) ?? [])].filter(
          d => d !== f
        );
        if (defs.length === 1) served.add(defs[0]);
      }
      const field = camel(name);
      const dep = fieldDeps.get(field) ?? {
        svc: new Set(),
        repo: new Set(),
        files: new Set(),
      };
      for (const sf of served) {
        dep.files.add(sf);
        for (const m of gqlService.get(sf))
          if (!plumbing.has(m)) dep.svc.add(m);
        for (const r of gqlRepo.get(sf))
          if (!plumbingRepo.has(r)) dep.repo.add(r);
        if (!fileFields.has(sf)) fileFields.set(sf, new Set());
        fileFields.get(sf).add(field);
      }
      fieldDeps.set(field, dep);
    }
  }
  const crateFiles = new Map();
  for (const f of gqlFiles) {
    if (!crateFiles.has(crateOf(f))) crateFiles.set(crateOf(f), []);
    crateFiles.get(crateOf(f)).push(f);
  }

  // front-end documents: root field → suites that reach the document
  const fieldSuites = new Map(); // field → Map(suite → distance)
  const fieldUncovered = new Map();
  const fieldShell = new Set();
  for (const doc of files) {
    if (!doc.endsWith('.graphql') || !doc.startsWith('frontend/src/')) continue;
    const gen = doc.replace(/\.graphql$/, '.generated.ts');
    if (!files.has(gen)) continue;
    let ast;
    try {
      ast = gqlParse(read(doc));
    } catch {
      continue; // codegen will complain; not this script's job
    }
    const roots = new Set();
    for (const def of ast.definitions) {
      if (def.kind !== 'OperationDefinition') continue;
      for (const sel of def.selectionSet.selections)
        if (sel.kind === 'Field' && sel.name.value !== '__typename')
          roots.add(sel.name.value);
    }
    const { hits, shell } = walkFrontend(gen, importers, owners, config.ignore);
    for (const field of roots) {
      if (!fieldSuites.has(field)) fieldSuites.set(field, new Map());
      for (const h of hits) {
        if (h.owner.kind === 'suite') {
          const prev = fieldSuites.get(field).get(h.owner.name);
          if (prev === undefined || h.distance < prev)
            fieldSuites.get(field).set(h.owner.name, h.distance);
        } else {
          if (!fieldUncovered.has(field)) fieldUncovered.set(field, new Set());
          fieldUncovered.get(field).add(h.owner.name);
        }
      }
      if (shell) fieldShell.add(field);
    }
  }

  // inverses
  const svcFields = new Map();
  const repoFields = new Map();
  for (const [field, dep] of fieldDeps) {
    for (const m of dep.svc) {
      if (!svcFields.has(m)) svcFields.set(m, new Set());
      svcFields.get(m).add(field);
    }
    for (const r of dep.repo) {
      if (!repoFields.has(r)) repoFields.set(r, new Set());
      repoFields.get(r).add(field);
    }
  }

  const isPlumbing = file => {
    const mod = moduleOf(file);
    return (
      (file.startsWith(SERVICE_SRC) && mod && plumbing.has(mod)) ||
      plumbingRepo.has(file)
    );
  };

  /** Fields a server file reaches, each at a distance. */
  const fieldsOf = file => {
    const fields = new Map();
    const add = (set, d) => {
      for (const f of set ?? [])
        if (!fields.has(f) || fields.get(f) > d) fields.set(f, d);
    };
    // A service module's own fields, then the modules that reference
    // crate::<it> — another domain, so beyond "near" (≤ 1): the module's own
    // suites run locally, the referencing domains are the nightly's.
    const addModule = (mod, d) => {
      add(svcFields.get(mod), d);
      for (const m of serviceHop.get(mod) ?? [])
        if (!plumbing.has(m)) add(svcFields.get(m), d + 2);
    };
    const mod = moduleOf(file);
    if (file.startsWith(SERVICE_SRC) && mod) {
      addModule(mod, 0);
    } else if (GRAPHQL_FILE.test(file)) {
      if (rootFileFields.has(file)) add(rootFileFields.get(file), 0);
      else if (fileFields.has(file)) add(fileFields.get(file), 0);
      else
        for (const g of crateFiles.get(crateOf(file)) ?? [])
          add(fileFields.get(g), 0);
    } else if (file.startsWith(REPOSITORY_SRC)) {
      // Resolvers naming the type directly, then the services built on it —
      // one hop, like a front-end importer.
      add(repoFields.get(file), 0);
      for (const m of repoToService.get(file) ?? []) addModule(m, 1);
    } else return null;
    return fields;
  };

  const classify = file => {
    const fields = fieldsOf(file);
    if (!fields) return null;
    const suites = new Map();
    const uncovered = new Set();
    let shell = false;
    for (const [field, d] of fields) {
      for (const [s, fd] of fieldSuites.get(field) ?? []) {
        const distance = d + fd;
        if (!suites.has(s) || suites.get(s).distance > distance)
          suites.set(s, { name: s, distance, chain: [file, field] });
      }
      for (const u of fieldUncovered.get(field) ?? []) uncovered.add(u);
      if (fieldShell.has(field)) shell = true;
    }
    return {
      fields: [...fields.keys()],
      suites: [...suites.values()],
      uncovered: [...uncovered],
      shell,
    };
  };

  return { classify, isPlumbing, plumbing, plumbingRepo };
};

// --- Classification -------------------------------------------------------

/**
 * One changed path → how it is charged. Precedence (first match wins):
 * rules → ignore → all → plumbing → import graph → server derivation →
 * unmapped. See e2e/affected.config.mjs.
 */
export const classify = (file, ctx) => {
  const { config, owners, importers, server, files } = ctx;
  const rule = config.rules.find(r => matchesAny(file, r.paths));
  if (rule)
    return {
      file,
      via: 'rule',
      suites: rule.suites.map(name => ({ name, distance: 0 })),
    };
  if (matchesAny(file, config.ignore)) return { file, via: 'ignore' };
  // A scripts-only edit to a package.json changes no dependency and no build.
  if (ctx.scriptsOnly?.has(file)) return { file, via: 'ignore' };
  if (matchesAny(file, config.all)) return { file, via: 'all' };
  if (server?.isPlumbing(file)) return { file, via: 'all', plumbing: true };

  if (inGraph(file)) {
    // A deleted file has no node: charge its own owners, and trust its
    // importers — which must have changed too — to carry the rest.
    const { hits, shell } = files.has(file)
      ? walkFrontend(file, importers, owners, config.ignore)
      : {
          hits: frontendOwners(owners, file).map(owner => ({
            owner,
            distance: 0,
            chain: [file],
          })),
          shell: false,
        };
    return {
      file,
      via: 'graph',
      deleted: !files.has(file),
      suites: hits
        .filter(h => h.owner.kind === 'suite')
        .map(h => ({
          name: h.owner.name,
          distance: h.distance,
          chain: h.chain,
        })),
      uncovered: hits
        .filter(h => h.owner.kind === 'uncovered')
        .map(h => h.owner.name),
      shell,
    };
  }

  if (file.startsWith('server/') && server) {
    const r = server.classify(file);
    if (r && (r.suites.length || r.uncovered.length || r.fields.length))
      return { file, via: 'server', deleted: !files.has(file), ...r };
  }
  return { file, via: 'unmapped' };
};

/** Fold per-file results into one selection. */
export const select = (results, config, suiteNames) => {
  const suites = new Map();
  const charge = (s, reason) => {
    const prev = suites.get(s.name);
    if (!prev || s.distance < prev.distance)
      suites.set(s.name, { ...s, reason });
  };
  const uncovered = new Map();
  let full = false;
  let shell = false;
  let exercised = false;
  for (const r of results) {
    if (r.via === 'ignore') continue;
    exercised = true;
    if (r.via === 'all') full = true;
    if (r.shell) shell = true;
    for (const s of r.suites ?? []) charge(s, r.file);
    for (const u of r.uncovered ?? []) {
      if (!uncovered.has(u)) uncovered.set(u, r.file);
    }
  }
  if (exercised) {
    // Smoke is always at distance 0 — near, so it runs locally on every tier
    // — even when a server change also reaches it at some distance.
    for (const name of config.smoke) {
      if (!(suites.get(name)?.distance === 0))
        suites.set(name, { name, distance: 0, reason: 'smoke' });
    }
  }
  const selected = full
    ? suiteNames.map(
        n => suites.get(n) ?? { name: n, distance: 2, reason: 'full run' }
      )
    : [...suites.values()];
  // What the change reaches first, nearest first; smoke and the full-run
  // filler after it.
  const filler = s => (s.reason === 'smoke' || s.reason === 'full run' ? 1 : 0);
  selected.sort(
    (a, b) =>
      filler(a) - filler(b) ||
      a.distance - b.distance ||
      a.name.localeCompare(b.name)
  );

  const tier = !exercised
    ? 'none'
    : full
      ? 'full'
      : selected.length > config.maxTargeted
        ? 'broad'
        : 'targeted';
  // What a local run takes when the selection is too big to run whole: the
  // suites the change sits in or one import from, plus smoke.
  const near = selected.filter(s => s.distance <= 1).map(s => s.name);
  return {
    tier,
    suites: selected,
    near: tier === 'targeted' ? selected.map(s => s.name) : near,
    shell,
    uncovered: [...uncovered].map(([name, file]) => ({ name, file })),
    unmapped: results.filter(r => r.via === 'unmapped').map(r => r.file),
    ignored: results.filter(r => r.via === 'ignore').map(r => r.file),
  };
};

// --- Green record: skip what already passed ---------------------------------

/**
 * A file is visible to the suites unless `ignore` says otherwise — `rules`
 * win, as in classify (run-e2e.sh sits under the ignored frontend/scripts/).
 */
export const visibleTo = config => f =>
  config.rules.some(r => matchesAny(f, r.paths)) ||
  !matchesAny(f, config.ignore);

/** Paths whose content differs between two {path: blob} snapshots. */
export const diffSnapshots = (before, after) => {
  const out = [];
  for (const p of new Set([...Object.keys(before), ...Object.keys(after)]))
    if (before[p] !== after[p]) out.push(p);
  return out.sort();
};

/**
 * Which of `runList` must run, given the suites green at the recorded
 * snapshot and the suites the change since then reaches. A suite skips only
 * when it was green AND nothing visible since reaches it — the same
 * assumption the selection itself makes, applied to "since the last green
 * run" instead of "since the base".
 */
export const planRun = ({ runList, green, reached }) => {
  const skip = runList.filter(n => green.has(n) && !reached.has(n));
  return { run: runList.filter(n => !skip.includes(n)), skip };
};

/**
 * The green set after a run. Suites the change reached are no longer known
 * green unless they just ran green; a red run clears every suite it ran
 * (which of them failed is Playwright's to say, not ours).
 */
export const nextGreen = ({ green, reached, ran, passed }) => {
  const out = new Set([...green].filter(n => !reached.has(n)));
  for (const n of ran) {
    if (passed) out.add(n);
    else out.delete(n);
  }
  return out;
};

/**
 * Split suites to run into one run per stack: the default suites first,
 * then each plugin profile (which needs its plugin installed, so can never
 * share the default stack).
 */
export const runGroups = (names, profiles) => {
  const profileOf = new Map(profiles.map(s => [s.name, s.profile]));
  const groups = new Map();
  for (const n of names) {
    const p = profileOf.get(n) ?? null;
    if (!groups.has(p)) groups.set(p, []);
    groups.get(p).push(n);
  }
  return [...groups]
    .sort(([a], [b]) => (a === null ? -1 : b === null ? 1 : a.localeCompare(b)))
    .map(([profile, ns]) => ({ profile, names: ns }));
};

// --- Config lint (--check) --------------------------------------------------

export const checkConfig = (config, files) => {
  const problems = [];
  const names = new Set(specNames(files));
  for (const n of Object.keys(config.overrides))
    if (!names.has(n)) problems.push(`overrides.${n} names no spec file`);
  for (const n of [...config.smoke, ...config.rules.flatMap(r => r.suites)])
    if (!names.has(n) && !profileSuites(files).some(s => s.name === n))
      problems.push(`'${n}' (smoke/rules) is not a suite`);

  // A profile directory needs its plugin — the nightly fails on one too.
  for (const profile of new Set(
    [...files]
      .map(f => /^frontend\/e2e\/specs\/plugins\/([^/]+)\//.exec(f)?.[1])
      .filter(Boolean)
  ))
    if (!files.has(`frontend/plugins/${profile}/package.json`))
      problems.push(
        `specs/plugins/${profile}/ has no plugin: frontend/plugins/${profile}/package.json is missing`
      );

  // Every suite owns something: its same-named section, or an override.
  for (const n of names) {
    if (n in config.overrides) continue;
    const section = n.replace(/-regression$/, '');
    if (!sectionNames(files).includes(section))
      problems.push(
        `${n} owns nothing: no frontend/src/sections/${section}/ — add it to 'overrides'`
      );
  }

  // Every glob must match something now: a typo'd glob selects nothing,
  // silently, forever.
  const globs = [
    ...config.all.map(g => ['all', g]),
    ...config.rules.flatMap(r => r.paths.map(g => ['rules', g])),
    ...Object.entries(config.overrides).flatMap(([n, gs]) =>
      gs.map(g => [n, g])
    ),
  ];
  const list = [...files];
  for (const [where, g] of globs)
    if (!list.some(f => matchesGlob(f, g)))
      problems.push(`${where}: '${g}' matches no file`);
  return problems;
};

// --- CLI --------------------------------------------------------------------

const git = (args, cwd) =>
  execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    // `ls-files -s` over the whole repo is a few MB — past the 1MB default.
    maxBuffer: 256 * 1024 * 1024,
  });

const lines = s => s.split('\n').filter(Boolean);

const trackedFiles = root =>
  new Set(
    lines(git(['ls-files', '--cached', '--others', '--exclude-standard'], root))
  );

const resolveBase = (root, requested) => {
  const candidates = requested ? [requested] : ['origin/develop', 'develop'];
  for (const ref of candidates) {
    try {
      return { ref, sha: git(['merge-base', 'HEAD', ref], root).trim() };
    } catch {
      /* try the next */
    }
  }
  throw new Error(
    `no merge-base with ${candidates.join(' or ')} — pass --base <ref>`
  );
};

const changedFiles = (root, base) => [
  ...new Set([
    ...lines(git(['diff', '--name-only', '--no-renames', base], root)),
    ...lines(git(['ls-files', '--others', '--exclude-standard'], root)),
  ]),
];

/**
 * The changed package.json files whose only difference from `base` is
 * `scripts`.
 */
const scriptsOnlyPackageJsons = (root, base, changed) => {
  const out = new Set();
  for (const f of changed.filter(c => c.endsWith('package.json'))) {
    try {
      const strip = s =>
        JSON.stringify({ ...JSON.parse(s), scripts: undefined });
      const before = git(['show', `${base}:${f}`], root);
      const after = readFileSync(path.join(root, f), 'utf8');
      if (strip(before) === strip(after)) out.add(f);
    } catch {
      /* added, deleted, or unparseable — treat as a real change */
    }
  }
  return out;
};

/**
 * {path: blob id} for every visible file as it is on disk now: index blob
 * ids for clean files, `git hash-object` for modified and untracked ones.
 * ~10k files in well under a second.
 */
const snapshot = (root, visible) => {
  const snap = {};
  for (const entry of git(['ls-files', '-s', '-z'], root).split('\0')) {
    const m = /^\d+ ([0-9a-f]+) \d\t(.+)$/s.exec(entry);
    if (m && visible(m[2])) snap[m[2]] = m[1];
  }
  const dirty = [
    ...lines(git(['diff', '--name-only', '--no-renames'], root)),
    ...lines(git(['ls-files', '--others', '--exclude-standard'], root)),
  ].filter(visible);
  const present = dirty.filter(f => existsSync(path.join(root, f)));
  for (const f of dirty) delete snap[f];
  if (present.length) {
    const ids = lines(
      execFileSync('git', ['hash-object', '--stdin-paths'], {
        cwd: root,
        input: present.join('\n'),
        encoding: 'utf8',
      })
    );
    present.forEach((f, i) => (snap[f] = ids[i]));
  }
  return snap;
};

// Per worktree, gitignored (e2e/.gitignore).
const GREEN_RECORD = path.join(FE_DIR, 'e2e/.affected-green.json');

const readGreen = () => {
  try {
    const r = JSON.parse(readFileSync(GREEN_RECORD, 'utf8'));
    return r.version === 1 ? r : null;
  } catch {
    return null;
  }
};

const snapshotId = snap =>
  createHash('sha256').update(JSON.stringify(snap)).digest('hex').slice(0, 10);

const load = name => {
  try {
    return createRequire(path.join(FE_DIR, 'package.json'))(name);
  } catch {
    throw new Error(
      `${name} is not installed — run \`pnpm install\` in frontend/`
    );
  }
};

/**
 * `--files` paths as a person types them: relative to where they ran the
 * command (pnpm scripts run in frontend/, so `src/x.ts` must mean
 * frontend/src/x.ts), or already repo-relative. A path that no longer
 * exists is cwd-relative too, unless it starts with a repo top-level entry
 * (`server/…`), which only a repo-relative path would.
 */
export const repoRelative = (given, root, cwd) => {
  if (path.isAbsolute(given)) return path.relative(root, given);
  const fromCwd = path.relative(root, path.resolve(cwd, given));
  if (existsSync(path.join(root, fromCwd))) return fromCwd;
  const top = given.split('/')[0];
  return existsSync(path.join(root, top)) ? given : fromCwd;
};

const parseArgs = argv => {
  const opts = {
    files: null,
    base: null,
    run: false,
    json: false,
    list: false,
    check: false,
    runAll: false,
    force: false,
    status: false,
    pushHook: false,
    pw: [],
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--') {
      opts.pw = argv.slice(i + 1);
      break;
    } else if (a === '--base') opts.base = argv[++i];
    else if (a === '--files') {
      opts.files = [];
      while (argv[i + 1] && !argv[i + 1].startsWith('--'))
        opts.files.push(argv[++i]);
    } else if (a === '--run') opts.run = true;
    else if (a === '--run-all') opts.run = opts.runAll = true;
    else if (a === '--force') opts.force = true;
    else if (a === '--status') opts.status = true;
    else if (a === '--push-hook') opts.status = opts.pushHook = true;
    else if (a === '--json') opts.json = true;
    else if (a === '--list') opts.list = true;
    else if (a === '--check') opts.check = true;
    else throw new Error(`unknown argument: ${a}`);
  }
  return opts;
};

const describe = s => {
  if (s.reason === 'smoke' || s.reason === 'full run') return s.reason;
  if (!s.chain || s.chain.length < 2) return s.reason;
  const short = f => f.replace(/^frontend\//, '');
  const chain = s.chain.map(short);
  return chain.length <= 3
    ? chain.join(' → ')
    : `${chain[0]} → (${chain.length - 2} more) → ${chain.at(-1)}`;
};

const report = (sel, meta) => {
  const out = [];
  out.push(`e2e:affected — ${meta.count} changed file(s) ${meta.against}`);
  out.push('');
  if (sel.tier === 'none') {
    out.push('Nothing an e2e suite can observe changed — no suites to run.');
    return out.join('\n');
  }
  const blurb = {
    targeted: 'run all of these',
    broad: `more than ${meta.maxTargeted} suites — run the near ones locally; the nightly runs the rest`,
    full: 'harness, schema or shared plumbing changed — every suite; run the near ones locally; the nightly runs them all',
  }[sel.tier];
  out.push(`Tier: ${sel.tier} — ${sel.suites.length} suite(s); ${blurb}`);
  out.push('');
  const width = Math.max(...sel.suites.map(s => s.name.length));
  for (const s of sel.suites) {
    const mark =
      sel.tier !== 'targeted' && sel.near.includes(s.name) ? '*' : ' ';
    out.push(` ${mark} ${s.name.padEnd(width)}  ${describe(s)}`);
  }
  if (sel.tier !== 'targeted') out.push('   (* near: runs locally)');
  if (sel.shell)
    out.push(
      '\nShell code changed (used by the app outside every screen) — smoke covers it.'
    );
  if (sel.uncovered.length) {
    out.push(
      '\nNo e2e suite covers (consider /run-exploratory, or unit tests):'
    );
    for (const u of sel.uncovered) out.push(`  ${u.name}  (${u.file})`);
  }
  if (sel.unmapped.length) {
    out.push(
      '\nUnmapped — smoke only. Nothing reaches these; if a suite should, say so in frontend/e2e/affected.config.mjs:'
    );
    for (const f of sel.unmapped) out.push(`  ${f}`);
  }
  if (sel.ignored.length)
    out.push(`\nIgnored: ${sel.ignored.length} file(s) no suite can observe.`);
  out.push('');
  out.push(
    `Run: pnpm e2e:affected --run${sel.tier === 'targeted' ? '' : '   (near only; --run-all for everything)'}`
  );
  return out.join('\n');
};

const main = async () => {
  const opts = parseArgs(process.argv.slice(2));
  const root = git(['rev-parse', '--show-toplevel'], FE_DIR).trim();
  const configPath = path.join(FE_DIR, 'e2e/affected.config.mjs');
  // e2e/ is kept out of the public mirror (.github/mirror/rules.txt); there
  // is no config to lint and no suite to select, so `pnpm check` must not fail.
  if (!existsSync(configPath)) {
    if (!opts.pushHook)
      console.log('e2e:affected: skipped — no e2e/ in this tree');
    return;
  }
  const rawConfig = await import(pathToFileURL(configPath).href);
  const files = trackedFiles(root);
  const config = effectiveConfig(rawConfig, files);

  if (opts.check) {
    const problems = checkConfig(rawConfig, files);
    if (problems.length) {
      console.error(
        `e2e:affected --check: ${problems.length} problem(s) in e2e/affected.config.mjs:\n  ${problems.join('\n  ')}`
      );
      process.exit(1);
    }
    console.log(
      `e2e:affected --check: ${allSuiteNames(files).length} suites, config complete.`
    );
    return;
  }

  let changed, against;
  let scriptsOnly = new Set();
  if (opts.files) {
    const cwd = process.env.INIT_CWD ?? process.cwd();
    changed = opts.files.map(f => repoRelative(f, root, cwd));
    against = '(given with --files)';
  } else {
    const base = resolveBase(root, opts.base);
    changed = changedFiles(root, base.sha);
    scriptsOnly = scriptsOnlyPackageJsons(root, base.sha, changed);
    against = `vs ${base.ref} (merge-base ${base.sha.slice(0, 10)}), including uncommitted`;
  }

  // The green record applies only to a plain run of this tree against this
  // checkout's server: --files is hypothetical, extra Playwright args
  // (--grep, --ui) run a subset, OMS_DIR swaps the server.
  const useRecord =
    (opts.run || opts.status) &&
    !opts.files &&
    !opts.pw.length &&
    !process.env.OMS_DIR &&
    !process.env.E2E_RUN_TAG;
  const record = useRecord && !opts.force ? readGreen() : null;
  const snap = useRecord ? snapshot(root, visibleTo(config)) : null;
  const sinceGreen = record ? diffSnapshots(record.files, snap) : [];

  const read = f => readFileSync(path.join(root, f), 'utf8');
  const owners = ownersOf(config, files);
  const touched = [...changed, ...sinceGreen];
  const needsServer = touched.some(f => f.startsWith('server/'));
  const needsGraph = needsServer || touched.some(inGraph);
  const importers = needsGraph
    ? buildImporters(load('typescript'), files, read)
    : new Map();
  const server = needsServer
    ? buildServerIndex(load('graphql').parse, {
        config,
        files,
        read,
        importers,
        owners,
      })
    : null;
  const ctx = { config, files, scriptsOnly, owners, importers, server };
  const results = changed.map(f => classify(f, ctx));
  const sel = select(results, config, allSuiteNames(files));

  // What a `--run` would run, and what it would skip as already green: the
  // change since the last green run goes through the same selection (smoke
  // included whenever anything visible changed).
  const runList = opts.runAll ? sel.suites.map(s => s.name) : sel.near;
  const reached = new Set(
    record
      ? select(
          sinceGreen.map(f => classify(f, ctx)),
          config,
          allSuiteNames(files)
        ).suites.map(s => s.name)
      : []
  );
  const green = new Set(record?.green ?? []);
  const { run: toRun, skip } = planRun({ runList, green, reached });

  if (opts.status) {
    // Nothing printed and exit 0 when every suite at risk is already green;
    // otherwise name them and exit 3 (2 is a PreToolUse hook's "block").
    if (!toRun.length) return;
    const line =
      `${toRun.length} e2e suite(s) at risk have not passed since the last change: ` +
      toRun.join(' ');
    if (opts.pushHook) {
      console.log(
        JSON.stringify({
          systemMessage: `⚠ e2e:affected — ${line}. Pushing anyway (warning only).`,
          hookSpecificOutput: {
            hookEventName: 'PreToolUse',
            additionalContext:
              `e2e:affected: ${line}. This push is not blocked. Unless the user ` +
              'said to skip e2e, run `cd frontend && pnpm e2e:affected --run` ' +
              '(it skips suites already green) and, if this branch has a PR, ' +
              're-fetch its body and update only the 🤖 e2e line with the result.',
          },
        })
      );
      return;
    }
    console.log(line);
    process.exit(3);
  }

  if (opts.json) {
    console.log(JSON.stringify({ against, changed: results, ...sel }, null, 2));
  } else if (opts.list) {
    for (const s of sel.suites) console.log(s.name);
  } else {
    console.log(
      report(sel, {
        count: changed.length,
        against,
        maxTargeted: config.maxTargeted,
      })
    );
  }

  if (opts.run) {
    if (!runList.length) return;
    if (skip.length)
      console.log(
        `\nAlready green at ${record.id}, and nothing visible since reaches them` +
          ` (${sinceGreen.length} file(s) changed since): ${skip.join(' ')}` +
          `\n  --force re-runs them.`
      );
    // One run per stack: the default suites, then each plugin profile on its
    // own stack with that plugin installed. `outcomes` is what each run did.
    const save = outcomes => {
      if (!useRecord) return;
      let g = nextGreen({ green, reached, ran: [], passed: true });
      for (const { names, passed } of outcomes)
        g = nextGreen({ green: g, reached: new Set(), ran: names, passed });
      writeFileSync(
        GREEN_RECORD,
        JSON.stringify({
          version: 1,
          id: snapshotId(snap),
          at: new Date().toISOString(),
          green: [...g].sort(),
          files: snap,
        })
      );
    };
    if (!toRun.length) {
      console.log('Nothing to run.');
      save([]);
      return;
    }

    const outcomes = [];
    let status = 0;
    // A profile is named only for its own run, never inherited by the default.
    const { E2E_PLUGIN_PROFILE: _, ...baseEnv } = process.env;
    for (const { profile, names } of runGroups(toRun, profileSuites(files))) {
      // Anchored on the directory so `login-regression` does not also match
      // `relogin-regression`.
      const filters = names.map(n =>
        profile ? `specs/plugins/${profile}/${n}\\.spec` : `specs/${n}\\.spec`
      );
      console.log(
        `\nRunning ${names.length} suite(s)` +
          (profile ? ` on the ${profile} plugin profile's own stack` : '') +
          `: ${names.join(' ')}\n`
      );
      const r = spawnSync(
        'bash',
        [path.join(SCRIPT_DIR, 'run-e2e.sh'), ...filters, ...opts.pw],
        {
          cwd: FE_DIR,
          stdio: 'inherit',
          env: profile ? { ...baseEnv, E2E_PLUGIN_PROFILE: profile } : baseEnv,
        }
      );
      outcomes.push({ names, passed: r.status === 0 });
      if (r.status !== 0) status = r.status ?? 1;
    }
    save(outcomes);
    process.exit(status);
  }
};

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main().catch(e => {
    // As a push hook, a failure must stay silent and exit 0: a PreToolUse
    // hook exiting 2 would block the push, and this hook only ever warns.
    if (process.argv.includes('--push-hook')) process.exit(0);
    console.error(`e2e:affected: ${e.message}`);
    process.exit(2);
  });
}
