#!/usr/bin/env node
/*
 * Which e2e suites does this change put at risk?
 *
 *   pnpm e2e:affected                    # vs merge-base with origin/develop
 *   pnpm e2e:affected --base origin/v3.2 # another base
 *   pnpm e2e:affected --files a.ts b.rs  # explicit repo-relative paths
 *   pnpm e2e:affected --run [-- <pw args>]   # run the selection locally
 *   pnpm e2e:affected --json             # machine-readable (CI)
 *   pnpm e2e:affected --list             # suite names only, one per line
 *   pnpm e2e:affected --check            # lint the map (part of `pnpm check`)
 *
 * The map and the reasoning behind it live in e2e/affected.config.mjs. In
 * short: front-end changes are walked up the runtime import graph to the
 * screens that reach them; server changes are matched to the domains each
 * suite owns, plus one hop of `crate::<module>` references; anything the map
 * does not know runs smoke and is named, so the map gets extended rather
 * than silently selecting nothing.
 *
 * "Changed" is everything a reviewer would see: committed since the
 * merge-base, staged, unstaged, and untracked — an agent asks this before it
 * commits, not after.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path, { matchesGlob } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const posix = path.posix;
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const FE_DIR = path.resolve(SCRIPT_DIR, '../..');

// --- Matching -----------------------------------------------------------

const matchesAny = (file, globs) => globs.some(g => matchesGlob(file, g));

// A suite owns its spec file as well as its screens, so an edit to the spec
// (or to a helper only it imports) selects it through the same graph walk.
export const ownersOf = config => {
  const owners = [];
  for (const [name, s] of Object.entries(config.suites)) {
    owners.push({
      name,
      kind: 'suite',
      frontend: [...s.frontend, `frontend/e2e/specs/${name}.spec.ts`],
      server: s.server,
    });
  }
  for (const [name, s] of Object.entries(config.uncovered)) {
    owners.push({ name, kind: 'uncovered', ...s });
  }
  return owners;
};

const frontendOwners = (owners, file) =>
  owners.filter(o => matchesAny(file, o.frontend));
const serverOwners = (owners, file) =>
  owners.filter(o => matchesAny(file, o.server));

// --- Front-end import graph ----------------------------------------------

const CODE = /\.(tsx?|jsx?|mjs|cjs)$/;
const RESOLVE_EXTS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json'];
const inGraph = f =>
  f.startsWith('frontend/src/') || f.startsWith('frontend/e2e/');

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

// --- Server: one hop of module references ---------------------------------

const SERVICE_MODULE = /^server\/service\/src\/([a-z0-9_]+)(?:\.rs$|\/)/;

/**
 * For each service module, the files OUTSIDE it that name it directly —
 * `crate::<module>` inside the service crate, `service::<module>` from any
 * other crate (graphql, server, cli).
 */
export const buildServiceReferrers = (files, read) => {
  const referrers = new Map();
  for (const f of files) {
    if (!f.startsWith('server/') || !f.endsWith('.rs')) continue;
    const own = SERVICE_MODULE.exec(f)?.[1];
    const re = f.startsWith('server/service/src/')
      ? /\bcrate::([a-z0-9_]+)/g
      : /\bservice::([a-z0-9_]+)/g;
    for (const [, mod] of read(f).matchAll(re)) {
      if (mod === own) continue;
      if (!referrers.has(mod)) referrers.set(mod, new Set());
      referrers.get(mod).add(f);
    }
  }
  return referrers;
};

// --- Classification -------------------------------------------------------

/**
 * One changed path → how it is charged. Precedence (first match wins):
 * rules → ignore → all → import graph → suites' server globs → uncovered →
 * unmapped. See e2e/affected.config.mjs.
 */
export const classify = (file, ctx) => {
  const { config, owners, importers, referrers, files } = ctx;
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

  if (file.startsWith('server/')) {
    const direct = serverOwners(owners, file);
    const suites = new Map(
      direct
        .filter(o => o.kind === 'suite')
        .map(o => [o.name, { name: o.name, distance: 0 }])
    );
    const mod = SERVICE_MODULE.exec(file)?.[1];
    for (const ref of (mod && referrers.get(mod)) ?? []) {
      for (const o of serverOwners(owners, ref)) {
        if (o.kind === 'suite' && !suites.has(o.name))
          suites.set(o.name, { name: o.name, distance: 1, chain: [file, ref] });
      }
    }
    const uncovered = direct
      .filter(o => o.kind === 'uncovered')
      .map(o => o.name);
    if (suites.size || uncovered.length)
      return { file, via: 'server', suites: [...suites.values()], uncovered };
  }
  return { file, via: 'unmapped' };
};

/** Fold per-file results into one selection. */
export const select = (results, config) => {
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
    for (const name of config.smoke) {
      if (!suites.has(name))
        suites.set(name, { name, distance: 0, reason: 'smoke' });
    }
  }
  const allNames = Object.keys(config.suites);
  const selected = full
    ? allNames.map(
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

// --- Map lint (--check) ---------------------------------------------------

export const checkConfig = (config, files) => {
  const problems = [];
  const owners = ownersOf(config);
  const names = new Set(Object.keys(config.suites));

  const specs = [...files]
    .map(f => /^frontend\/e2e\/specs\/([^/]+)\.spec\.ts$/.exec(f)?.[1])
    .filter(Boolean);
  for (const s of specs)
    if (!names.has(s))
      problems.push(`spec ${s}.spec.ts has no entry in suites`);
  for (const n of names)
    if (!specs.includes(n)) problems.push(`suites.${n} names no spec file`);
  for (const n of [...config.smoke, ...config.rules.flatMap(r => r.suites)]) {
    if (!names.has(n)) problems.push(`'${n}' (smoke/rules) is not a suite`);
  }

  // Every glob must match something now: a typo'd glob selects nothing,
  // silently, forever.
  const globs = [
    ...config.all.map(g => ['all', g]),
    ...config.rules.flatMap(r => r.paths.map(g => ['rules', g])),
    ...owners.flatMap(o => [...o.frontend, ...o.server].map(g => [o.name, g])),
  ];
  for (const [where, g] of globs) {
    if (
      !g.startsWith('frontend/e2e/specs/') &&
      ![...files].some(f => matchesGlob(f, g))
    )
      problems.push(`${where}: '${g}' matches no file`);
  }

  // Every section and every server domain is placed somewhere on purpose. A
  // directory counts as placed when any file in it is — a grab-bag crate like
  // graphql/general is split across several suites, file by file.
  const placed = f =>
    matchesAny(f, config.ignore) ||
    matchesAny(f, config.all) ||
    config.rules.some(r => matchesAny(f, r.paths)) ||
    owners.some(o => matchesAny(f, o.frontend) || matchesAny(f, o.server));
  const topLevel = prefix => [
    ...new Set(
      [...files]
        .filter(f => f.startsWith(prefix))
        .map(f => prefix + f.slice(prefix.length).split('/')[0])
    ),
  ];
  for (const entry of [
    ...topLevel('frontend/src/sections/'),
    ...topLevel('server/service/src/'),
    ...topLevel('server/graphql/'),
  ]) {
    const under = files.has(entry)
      ? [entry]
      : [...files].filter(f => f.startsWith(`${entry}/`));
    if (!under.some(placed))
      problems.push(
        `${entry} is owned by no suite — add it to a suite, or to 'uncovered'`
      );
  }
  return problems;
};

// --- CLI --------------------------------------------------------------------

const git = (args, cwd) =>
  execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
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

const loadTypeScript = () => {
  try {
    return createRequire(path.join(FE_DIR, 'package.json'))('typescript');
  } catch {
    throw new Error(
      'typescript is not installed — run `pnpm install` in frontend/'
    );
  }
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
      '\nUnmapped — ran smoke only; place these in frontend/e2e/affected.config.mjs:'
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
  // is no map to lint and no suite to select, so `pnpm check` must not fail.
  if (!existsSync(configPath)) {
    console.log('e2e:affected: skipped — no e2e/ in this tree');
    return;
  }
  const config = await import(pathToFileURL(configPath).href);
  const files = trackedFiles(root);

  if (opts.check) {
    const problems = checkConfig(config, files);
    if (problems.length) {
      console.error(
        `e2e:affected --check: ${problems.length} problem(s) in e2e/affected.config.mjs:\n  ${problems.join('\n  ')}`
      );
      process.exit(1);
    }
    console.log(
      `e2e:affected --check: ${Object.keys(config.suites).length} suites, map complete.`
    );
    return;
  }

  let changed, against;
  let scriptsOnly = new Set();
  if (opts.files) {
    changed = opts.files.map(f =>
      existsSync(f) ? path.relative(root, path.resolve(f)) : f
    );
    against = '(given with --files)';
  } else {
    const base = resolveBase(root, opts.base);
    changed = changedFiles(root, base.sha);
    scriptsOnly = scriptsOnlyPackageJsons(root, base.sha, changed);
    against = `vs ${base.ref} (merge-base ${base.sha.slice(0, 10)}), including uncommitted`;
  }

  const read = f => readFileSync(path.join(root, f), 'utf8');
  const needsGraph = changed.some(inGraph);
  const needsServer = changed.some(f => SERVICE_MODULE.test(f));
  const ctx = {
    config,
    files,
    scriptsOnly,
    owners: ownersOf(config),
    importers: needsGraph
      ? buildImporters(loadTypeScript(), files, read)
      : new Map(),
    referrers: needsServer ? buildServiceReferrers(files, read) : new Map(),
  };
  const results = changed.map(f => classify(f, ctx));
  const sel = select(results, config);

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
    const toRun = opts.runAll ? sel.suites.map(s => s.name) : sel.near;
    if (!toRun.length) return;
    // Anchored on the directory so `login-regression` does not also match
    // `relogin-regression`.
    const filters = toRun.map(n => `specs/${n}\\.spec`);
    console.log(`\nRunning ${toRun.length} suite(s): ${toRun.join(' ')}\n`);
    const r = spawnSync(
      'bash',
      [path.join(SCRIPT_DIR, 'run-e2e.sh'), ...filters, ...opts.pw],
      {
        cwd: FE_DIR,
        stdio: 'inherit',
      }
    );
    process.exit(r.status ?? 1);
  }
};

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main().catch(e => {
    console.error(`e2e:affected: ${e.message}`);
    process.exit(2);
  });
}
