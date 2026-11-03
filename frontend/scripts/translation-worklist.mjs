/*
 * The `translate` skill's catalog plumbing (`.claude/skills/translate/`).
 *
 *   build [locale…] [--base <ref>] [--backlog | --keys k1,k2] [--out <dir>]
 *         [--chunk-size <n>]
 *     Writes the keys each locale needs translating, with the context a
 *     translator needs, to `<out>/<locale>.<n>.json` (chunks grouped by key
 *     prefix), plus `<out>/<locale>.keys.json` (the flat key list, for
 *     `translate-locale --candidates --keys`). Which keys:
 *       default    English keys added or changed since <ref> (default: the
 *                  merge-base with origin/develop) that the locale lacks
 *       --backlog  every English key the locale lacks
 *       --keys     exactly these
 *     Keys whose English changed but which already carry a translation are
 *     listed as `stale` — reported, never rewritten. With no locales, every
 *     supported locale except English and overlays (a locale with a `base`,
 *     e.g. `fr-DJ`), which are never written.
 *
 *   apply <locale> <proposals.json> [--base <ref>] [--update]
 *     Writes `{ key: translation }` into the locale's catalogs. By default a
 *     key may be written only if it had no translation at <ref> (default:
 *     the merge-base with origin/develop), so this branch's own drafts can be
 *     corrected but nothing translated before it can. --update lifts that,
 *     for a terminology or glossary change the developer asked for. Refuses
 *     the whole batch if any key is refused, isn't an English key (or a
 *     plural form of one), isn't a plural category the locale uses, or drops
 *     or invents a placeholder.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import {
  catalogFiles,
  catalogPath,
  codepointCompare,
  englishSourceFor,
  fail,
  guidesRoot,
  isOverlay,
  placeholderProblem,
  placeholdersOf,
  pluralCategories,
  readCatalogAt,
  readJson,
  readLocaleRegistry,
  resolveBase,
  splitPlural,
  writeJson,
} from './lib/locale-catalog.mjs';

const usage = [
  'Usage: node scripts/translation-worklist.mjs build [locale…] [--base <ref>] [--backlog | --keys k1,k2] [--out <dir>] [--chunk-size <n>]',
  '       node scripts/translation-worklist.mjs apply <locale> <proposals.json> [--base <ref>] [--update]',
].join('\n');

// Each command's flags: `true` for a switch, `false` for one taking a value.
// Anything else is refused, so a typo such as `--updte` can't be ignored.
const commandFlags = {
  build: {
    base: false,
    backlog: true,
    keys: false,
    out: false,
    'chunk-size': false,
  },
  apply: { base: false, update: true },
};

const parseArgs = (command, argv) => {
  const known = commandFlags[command] ?? {};
  const flags = {};
  const positional = [];
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith('--')) {
      positional.push(arg);
      continue;
    }
    const name = arg.slice(2);
    if (!Object.hasOwn(known, name)) fail(`Unknown flag ${arg}.\n${usage}`);
    if (known[name]) {
      flags[name] = true;
      continue;
    }
    const value = argv[index + 1];
    if (value === undefined || value.startsWith('--')) {
      fail(`${arg} needs a value.\n${usage}`);
    }
    flags[name] = value;
    index += 1;
  }
  return { flags, positional };
};

const sourceRoots = ['src', 'plugins'];
const sourceExtension = /\.(tsx?|mjs)$/;
const quotedKey = /['"`]([a-z][\w./-]*[\w])['"`]/g;

const walk = async directory => {
  let entries;
  try {
    entries = await fs.readdir(directory, { withFileTypes: true });
  } catch {
    return [];
  }
  const files = [];
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(full)));
    else if (sourceExtension.test(entry.name)) files.push(full);
  }
  return files;
};

// The usage line plus up to two meaningful lines above it — a lone `>` or
// `}` says nothing about whether the string is a column header or a button.
const contextFor = (lines, index) => {
  const above = [];
  for (let at = index - 1; at >= 0 && above.length < 2; at -= 1) {
    const text = lines[at].trim();
    if (text.length > 3) above.unshift(text);
  }
  return [...above, lines[index].trim()]
    .map(text => text.slice(0, 160))
    .join(' ⏎ ');
};

// Where each key is used in source: one pass over every file, matching quoted
// strings against the key set. Keys built dynamically won't be found — the
// translator then works from the key name and siblings alone.
const indexUsages = async keys => {
  const usages = new Map();
  for (const root of sourceRoots) {
    for (const file of await walk(root)) {
      if (/\.(test|spec)\.tsx?$/.test(file)) continue;
      const lines = (await fs.readFile(file, 'utf8')).split('\n');
      lines.forEach((line, index) => {
        for (const [, key] of line.matchAll(quotedKey)) {
          if (!keys.has(key)) continue;
          const list = usages.get(key) ?? [];
          if (list.length < 3) {
            list.push({
              at: `${file}:${index + 1}`,
              code: contextFor(lines, index),
            });
          }
          usages.set(key, list);
        }
      });
    }
  }
  return usages;
};

const stopwords = new Set(
  'the and for are but not you all any can has have this that with from was were will your our its his her they them their there then than been into out off one per via also only each more most such some very when what which who how why'.split(
    ' '
  )
);

const wordsOf = text =>
  new Set(
    text
      .toLowerCase()
      .replace(/\{\{[^}]*\}\}|\$t\([^)]*\)/g, ' ')
      .split(/[^a-z]+/)
      .filter(word => word.length >= 3 && !stopwords.has(word))
  );

/*
 * Existing translations whose English shares the rarer words of this one —
 * the evidence for how the catalog already renders its domain terms. Scored
 * by inverse document frequency, so "stocktake" and "pack" outweigh "item".
 */
const buildSimilarity = (en, translated) => {
  const index = new Map();
  const documentWords = new Map();
  for (const key of Object.keys(en)) {
    if (!translated.has(key)) continue;
    const words = wordsOf(en[key]);
    documentWords.set(key, words);
    for (const word of words) {
      if (!index.has(word)) index.set(word, []);
      index.get(word).push(key);
    }
  }
  const total = documentWords.size || 1;
  const idf = word => Math.log(total / (index.get(word)?.length ?? total));

  // Normalised by the candidate's length, so a short label that *is* the term
  // beats a paragraph that merely mentions it.
  return (english, exclude, limit) => {
    const shared = new Map();
    for (const word of wordsOf(english)) {
      const weight = idf(word);
      for (const key of index.get(word) ?? []) {
        if (exclude.has(key)) continue;
        shared.set(key, (shared.get(key) ?? 0) + weight);
      }
    }
    const scores = new Map(
      [...shared.entries()]
        .filter(([, score]) => score > 1.5)
        .map(([key, score]) => [
          key,
          score / Math.sqrt(documentWords.get(key).size || 1),
        ])
    );
    return [...scores.entries()]
      .sort((a, b) => b[1] - a[1] || codepointCompare(a[0], b[0]))
      .slice(0, limit)
      .map(([key]) => key);
  };
};

// Evidence is for terminology and tone; a long paragraph's first stretch
// carries that as well as the whole and keeps the worklist small.
const clip = text => (text.length > 220 ? `${text.slice(0, 220)}…` : text);

const build = async (locales, flags) => {
  const registry = await readLocaleRegistry();
  const targets = locales.length
    ? locales
    : registry.codes.filter(
        code => code !== 'en' && !isOverlay(registry, code)
      );
  for (const locale of targets) {
    if (!registry.codes.includes(locale)) fail(`Unknown locale "${locale}".`);
    if (locale === 'en') fail('`en` is the source catalog.');
    if (isOverlay(registry, locale)) {
      fail(
        `"${locale}" is an overlay on "${registry.meta[locale].base}" — its catalog is maintained by hand and never drafted.`
      );
    }
  }
  if (flags.backlog && flags.keys) fail('Use --backlog or --keys, not both.');

  const base =
    flags.backlog || flags.keys ? undefined : resolveBase(flags.base);
  const out = flags.out ?? 'translation-worklist';
  const chunkSize = Number(flags['chunk-size'] ?? 150);
  const explicitKeys = flags.keys
    ? new Set(flags.keys.split(',').map(key => key.trim()))
    : undefined;

  const enFiles = await catalogFiles('en');
  const en = {};
  const enBase = {};
  const fileOf = {};
  for (const file of enFiles) {
    const catalog = await readJson(catalogPath('en', file));
    Object.assign(en, catalog);
    for (const key of Object.keys(catalog)) fileOf[key] = file;
    if (base) Object.assign(enBase, readCatalogAt(base, 'en', file));
  }

  const allKeys = new Set(Object.keys(en));
  for (const key of Object.keys(en)) {
    const plural = splitPlural(key);
    if (plural) allKeys.add(plural.base);
  }
  const usages = await indexUsages(allKeys);

  const overlays = registry.codes.filter(code => isOverlay(registry, code));
  const overlayCatalogs = {};
  for (const code of overlays) {
    overlayCatalogs[code] = await readJson(catalogPath(code), {});
  }

  await fs.mkdir(out, { recursive: true });
  const summary = [];

  for (const locale of targets) {
    const localeFiles = new Set(await catalogFiles(locale));
    const target = {};
    const targetBase = {};
    for (const file of localeFiles) {
      Object.assign(target, await readJson(catalogPath(locale, file)));
      if (base) Object.assign(targetBase, readCatalogAt(base, locale, file));
    }
    const translated = new Set(Object.keys(target));
    const similarTo = buildSimilarity(en, translated);
    const categories = pluralCategories(registry, locale);
    const localeOverlays = overlays.filter(
      code => registry.meta[code].base === locale
    );

    const byEnglish = new Map();
    for (const key of translated) {
      if (!en[key]) continue;
      const normalised = en[key].trim().toLowerCase();
      if (!byEnglish.has(normalised)) byEnglish.set(normalised, []);
      byEnglish.get(normalised).push(key);
    }

    const evidence = key => {
      const entry = {
        key,
        english: clip(en[key]),
        current: clip(target[key]),
      };
      const overridden = Object.fromEntries(
        localeOverlays
          .filter(code => Object.hasOwn(overlayCatalogs[code], key))
          .map(code => [code, clip(overlayCatalogs[code][key])])
      );
      if (Object.keys(overridden).length) entry.overlay = overridden;
      return entry;
    };

    const selected = Object.keys(en).filter(key => {
      if (explicitKeys) {
        return (
          explicitKeys.has(key) || explicitKeys.has(splitPlural(key)?.base)
        );
      }
      if (flags.backlog) return true;
      return enBase[key] !== en[key];
    });

    const items = new Map();
    const stale = [];
    let skippedFile = 0;
    for (const key of selected) {
      if (!localeFiles.has(fileOf[key])) {
        skippedFile += 1;
        continue;
      }
      if (Object.hasOwn(target, key)) {
        // Changed English over an existing translation nobody has revisited.
        if (
          base &&
          Object.hasOwn(enBase, key) &&
          target[key] === targetBase[key]
        ) {
          stale.push({
            key,
            englishBefore: enBase[key],
            englishNow: en[key],
            current: target[key],
          });
        }
        continue;
      }

      const plural = splitPlural(key);
      const id = plural ? plural.base : key;
      if (items.has(id)) continue;

      const englishForms = plural
        ? Object.fromEntries(
            Object.keys(en)
              .filter(other => splitPlural(other)?.base === plural.base)
              .map(other => [splitPlural(other).category, en[other]])
          )
        : undefined;
      const english = plural ? (englishForms.other ?? en[key]) : en[key];
      const exclude = new Set([key]);

      const sameEnglish = (byEnglish.get(english.trim().toLowerCase()) ?? [])
        .filter(other => other !== key)
        .slice(0, 4);
      sameEnglish.forEach(other => exclude.add(other));

      const item = {
        key: id,
        file: fileOf[key],
        kind: id.split('.')[0],
        english: plural ? undefined : english,
        placeholders: placeholdersOf(english),
      };
      if (plural) {
        item.plural = {
          englishForms,
          requiredCategories: categories,
          keys: categories
            .map(category => `${plural.base}_${category}`)
            .filter(form => !Object.hasOwn(target, form)),
        };
      }
      const used = usages.get(id) ?? usages.get(key);
      if (used) item.usages = used;
      if (sameEnglish.length) item.sameEnglish = sameEnglish.map(evidence);
      const similar = similarTo(english, exclude, 6);
      if (similar.length) item.similar = similar.map(evidence);
      items.set(id, item);
    }

    const list = [...items.values()].sort((a, b) =>
      codepointCompare(a.key, b.key)
    );
    const guide = path.join(guidesRoot, `${locale}.md`);
    const hasGuide = await fs
      .access(guide)
      .then(() => true)
      .catch(() => false);

    const chunks = [];
    for (let start = 0; start < list.length; start += chunkSize) {
      chunks.push(list.slice(start, start + chunkSize));
    }
    for (const [index, chunk] of chunks.entries()) {
      await writeJson(path.join(out, `${locale}.${index + 1}.json`), {
        locale,
        guide: hasGuide ? guide : null,
        pluralCategories: categories,
        chunk: `${index + 1}/${chunks.length}`,
        items: chunk,
      });
    }
    const flatKeys = list.flatMap(item => item.plural?.keys ?? [item.key]);
    await fs.writeFile(
      path.join(out, `${locale}.keys.json`),
      `${JSON.stringify(flatKeys, null, 2)}\n`
    );
    if (stale.length) {
      await fs.writeFile(
        path.join(out, `${locale}.stale.json`),
        `${JSON.stringify(stale, null, 2)}\n`
      );
    }

    summary.push(
      `${locale}: ${list.length} to translate in ${chunks.length} chunk(s)` +
        (stale.length ? `, ${stale.length} stale` : '') +
        (skippedFile ? `, ${skippedFile} skipped (catalog file absent)` : '') +
        (hasGuide ? '' : ', NO GUIDE')
    );
  }

  console.log(
    [
      `worklist in ${out}/ (${base ? `changes since ${base.slice(0, 10)}` : flags.backlog ? 'backlog' : 'explicit keys'})`,
      ...summary,
    ].join('\n')
  );
};

const apply = async (locale, proposalsFile, flags) => {
  if (!locale || !proposalsFile) fail(usage);
  const registry = await readLocaleRegistry();
  if (!registry.codes.includes(locale)) fail(`Unknown locale "${locale}".`);
  if (locale === 'en') fail('`en` is the source catalog.');
  if (isOverlay(registry, locale)) {
    fail(`"${locale}" is an overlay catalog — never drafted.`);
  }

  const proposals = await readJson(proposalsFile);
  const categories = pluralCategories(registry, locale);
  const base = resolveBase(flags.base);

  const en = {};
  const fileOf = {};
  for (const file of await catalogFiles('en')) {
    const catalog = await readJson(catalogPath('en', file));
    Object.assign(en, catalog);
    for (const key of Object.keys(catalog)) fileOf[key] = file;
  }
  const catalogs = {};
  const before = {};
  for (const file of await catalogFiles(locale)) {
    catalogs[file] = await readJson(catalogPath(locale, file));
    before[file] = readCatalogAt(base, locale, file);
  }

  const problems = [];
  const additions = {};
  for (const [key, value] of Object.entries(proposals)) {
    const plural = splitPlural(key);
    const file = fileOf[key] ?? (plural && fileOf[`${plural.base}_other`]);
    const english = englishSourceFor(en, key);
    if (typeof value !== 'string' || !value.trim()) {
      problems.push(`${key}: empty or not a string`);
    } else if (english === undefined || !file) {
      problems.push(`${key}: not an English key or a plural form of one`);
    } else if (plural && !categories.includes(plural.category)) {
      problems.push(
        `${key}: "${plural.category}" isn't a ${locale} plural category (${categories.join(', ')})`
      );
    } else if (!catalogs[file]) {
      problems.push(`${key}: ${locale} has no ${file}`);
    } else if (
      !flags.update &&
      Object.hasOwn(before[file], key) &&
      before[file][key] !== ''
    ) {
      // An empty value renders blank, so filling it counts as adding.
      problems.push(
        `${key}: translated before this branch — only --update changes it, for a terminology change the developer asked for`
      );
    } else {
      const problem = placeholderProblem(english, value, key);
      if (problem) problems.push(`${key}: placeholders ${problem}`);
      else (additions[file] ??= {})[key] = value;
    }
  }
  if (problems.length) {
    fail(
      `Nothing written — ${problems.length} problem(s):\n  ${problems.join('\n  ')}`
    );
  }

  let inserted = 0;
  let overwritten = 0;
  for (const [file, entries] of Object.entries(additions)) {
    for (const key of Object.keys(entries)) {
      if (Object.hasOwn(catalogs[file], key)) overwritten += 1;
      else inserted += 1;
    }
    await writeJson(catalogPath(locale, file), {
      ...catalogs[file],
      ...entries,
    });
  }
  console.log(
    `${locale}: inserted ${inserted} key(s), overwrote ${overwritten} against ${base.slice(0, 10)}`
  );
};

const [command, ...rest] = process.argv.slice(2);
const { flags, positional } = parseArgs(command, rest);
if (command === 'build') await build(positional, flags);
else if (command === 'apply') await apply(positional[0], positional[1], flags);
else fail(usage);
