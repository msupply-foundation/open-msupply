/*
 * The take-over inventory: what a deployment's database holds for its program
 * forms, read before (and to check) moving them into a form plugin
 * (plugins/MIGRATING-PROGRAMS.md § 3). It reads a Postgres copy of the
 * deployment's central server, with `psql` and the connection psql takes from
 * PGHOST, PGPORT, PGUSER, PGDATABASE and PGPASSWORD. Every query runs in a
 * read-only transaction, so it cannot change the database, and nothing it
 * prints or writes holds a record's values, except a fixture's, which `fixture`
 * anonymises first.
 *
 *   report    the registry entries (name, category, program, current schema,
 *             event rules); every schema id the records are pinned to, with
 *             counts and dates; the programs; and the fields records hold
 *             that their pinned schema does not declare, by path and count.
 *             Programschemas' push scripts overwrite a schema under the same
 *             id, so records on one id can carry an earlier schema's fields:
 *             the plugin must keep them. It warns where install will refuse
 *             (a second Patient-category entry; two entries for a type).
 *
 *             With --plugin <dir>, it also checks the plugin against the
 *             deployment: each declared document type against the
 *             registry's names (a take-over matches on them), every pinned
 *             schema id declared, each declared deployment version's JSON
 *             and the legacy UI schema compared as data with what is
 *             deployed, and, for the current version, every pattern and
 *             enum counted against the records: how many values it would
 *             refuse, and their shapes (length and characters, never the
 *             values).
 *
 *             With --out <dir>, it writes each entry's deployed JSON Schema
 *             and UI schema there, keys in the order the deployment stores
 *             them: the files a plugin's v1.json and legacy-ui.json copy.
 *
 *   pick      lists documents of a type matching a SQL condition on `j`,
 *             the document's data as jsonb (the latest version of each):
 *             document id, patient id, store, date saved and how many
 *             versions it has, to choose examples for fixtures or for
 *             trying the plugin on real records. --with-names adds each
 *             patient's name: personal data, for a local file only.
 *
 *   fixture   writes one document's data as a fixture with every personal
 *             value replaced: a string the schema does not restrict to an
 *             enum becomes an invented value of the same shape (a date a
 *             fixed date, digits and spaces the same with every digit a 1,
 *             any other text `fixture`), unless named with --keep (preset
 *             lists the schema leaves as free text). Yes/no, numbers, enum
 *             values and all-capitals codes (`ACTIVE`, `FEMALE`: enum values
 *             a schema can leave undeclared, never personal) stay as
 *             recorded. It prints the paths it kept and
 *             replaced, never a value.
 *
 * Usage, from frontend/:
 *   pnpm forms:inventory report [--plugin plugins/<dir>] [--out <dir>]
 *     > inventory.md
 *   pnpm forms:inventory pick --type <documentType> --where "<SQL on j>"
 *     [--limit 5] [--with-names]
 *   pnpm forms:inventory fixture --doc <document id> --out <file>
 *     [--keep <path>]...
 *
 * A path is dotted, with `[]` for an array's items: contactDetails[].region.
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const [command, ...rest] = process.argv.slice(2);
const flags = {};
for (let i = 0; i < rest.length; i += 2) {
  const key = rest[i]?.replace(/^--/, '');
  if (key === 'with-names') {
    flags[key] = true;
    i -= 1;
    continue;
  }
  (flags[key] ??= []).push(rest[i + 1]);
}
const flag = name => flags[name]?.[0];

const fail = message => {
  process.stderr.write(`forms:inventory: ${message}\n`);
  process.exit(1);
};

const lit = value => `'${String(value).replaceAll("'", "''")}'`;

/** Rows of a SELECT, as objects, in a read-only transaction. */
const query = sql => {
  const result = spawnSync(
    'psql',
    [
      '-X',
      '-At',
      '-v',
      'ON_ERROR_STOP=1',
      '-c',
      `select coalesce(json_agg(t), '[]') from (${sql}) t`,
    ],
    {
      encoding: 'utf8',
      maxBuffer: 1 << 30,
      env: { ...process.env, PGOPTIONS: '-c default_transaction_read_only=on' },
    }
  );
  if (result.error) fail(`psql: ${result.error.message}`);
  if (result.status !== 0) fail(result.stderr.trim());
  return JSON.parse(result.stdout);
};

// ── JSON Schema walking ────────────────────────────────────────────────────

const resolve = (schema, node) => {
  let current = node;
  for (let hops = 0; current?.$ref && hops < 20; hops += 1) {
    current = current.$ref
      .replace(/^#\//, '')
      .split('/')
      .reduce((n, part) => n?.[part], schema);
  }
  return current;
};

/** Every sub-schema a value at `node` is checked against. */
const alternatives = (schema, node) => {
  const resolved = resolve(schema, node);
  if (!resolved || typeof resolved !== 'object') return [];
  return [
    resolved,
    ...['allOf', 'anyOf', 'oneOf'].flatMap(key =>
      (resolved[key] ?? []).flatMap(sub => alternatives(schema, sub))
    ),
  ];
};

/**
 * The sub-schemas at a dotted path, or `open` when only an object that
 * permits any property admits it, or nothing when no part of the schema
 * declares it.
 */
const schemaAt = (schema, dotted) => {
  let nodes = [schema];
  for (const segment of dotted
    .replaceAll('[]', '.[]')
    .split('.')
    .filter(Boolean)) {
    const next = [];
    let open = false;
    for (const node of nodes.flatMap(n => alternatives(schema, n))) {
      if (segment === '[]') {
        if (node.items) next.push(node.items);
        continue;
      }
      const properties = node.properties ?? {};
      if (segment in properties) next.push(properties[segment]);
      else if (typeof node.additionalProperties === 'object')
        next.push(node.additionalProperties);
      else if (
        node.additionalProperties === true ||
        (node.type === 'object' &&
          !node.properties &&
          node.additionalProperties === undefined)
      )
        open = true;
    }
    if (next.length === 0) return open ? 'open' : null;
    nodes = next;
  }
  return nodes.flatMap(n => alternatives(schema, n));
};

/**
 * Every string path in a schema carrying a pattern or an enum. A schema that
 * nests a type in itself (a related person holding related people) is
 * walked to a fixed depth.
 */
const constrainedStrings = (schema, node = schema, dotted = '') => {
  const found = [];
  if (dotted.split(/\.|\[\]/).length > 12) return found;
  for (const alt of alternatives(schema, node)) {
    const types = [alt.type].flat();
    if (types.includes('string') && (alt.pattern || alt.enum))
      found.push({ path: dotted, pattern: alt.pattern, enum: alt.enum });
    for (const [key, child] of Object.entries(alt.properties ?? {}))
      found.push(
        ...constrainedStrings(schema, child, dotted ? `${dotted}.${key}` : key)
      );
    if (alt.items)
      found.push(...constrainedStrings(schema, alt.items, `${dotted}[]`));
  }
  return found;
};

const jsonPath = dotted =>
  '$' +
  dotted
    .replaceAll('[]', '.[]')
    .split('.')
    .filter(Boolean)
    .map(s => (s === '[]' ? '[*]' : `."${s}"`))
    .join('');

const sameData = (a, b) =>
  JSON.stringify(sortKeys(a)) === JSON.stringify(sortKeys(b));
const sortKeys = value =>
  Array.isArray(value)
    ? value.map(sortKeys)
    : value && typeof value === 'object'
      ? Object.fromEntries(
          Object.keys(value)
            .sort()
            .map(k => [k, sortKeys(value[k])])
        )
      : value;

const table = (headers, rows) =>
  [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map(
      r =>
        `| ${r.map(c => String(c ?? '').replaceAll('|', '\\|')).join(' | ')} |`
    ),
  ].join('\n');

// ── report ─────────────────────────────────────────────────────────────────

const PATHS_SQL = `
with recursive walk(type, schema_id, doc, path, val) as (
  select d.type, d.form_schema_id, d.id, k.key, k.value
  from latest_document d, jsonb_each(d.data::jsonb) k
  union all
  select w.type, w.schema_id, w.doc,
         w.path || case when jsonb_typeof(w.val) = 'object' then '.' || c.key else '[]' end, c.value
  from walk w, lateral (
    select e.key, e.value from jsonb_each(case when jsonb_typeof(w.val) = 'object' then w.val else '{}'::jsonb end) e
    union all
    select null, a.value from jsonb_array_elements(case when jsonb_typeof(w.val) = 'array' then w.val else '[]'::jsonb end) a
  ) c
)
select type, schema_id, path, count(distinct doc) as documents from walk group by 1, 2, 3`;

const report = () => {
  const out = [];
  const say = line => out.push(line);
  const registry = query(`
    select r.document_type, r.category, r.id, r.name, r.form_schema_id, c.name as context,
           r.config is not null and r.config::text not in ('null', '{}') as has_config,
           r.config::text as config
    from document_registry r left join context c on c.id = r.context_id
    order by r.category, r.document_type`);
  const pinned = query(`
    select d.type, d.form_schema_id, count(distinct d.name) as documents, count(*) as rows,
           count(distinct d.owner_name_link_id) as patients,
           min(d.datetime)::date as first_saved, max(d.datetime)::date as last_saved,
           exists (select 1 from form_schema f where f.id = d.form_schema_id) as schema_held
    from document d group by 1, 2 order by 1, min(d.datetime)`);
  const programs = query(`
    select p.id, p.name, p.context_id, p.is_immunisation,
           (select string_agg(r.document_type, ', ') from document_registry r where r.context_id = p.context_id) as registry_types
    from program p where p.deleted_datetime is null order by p.name`);
  const schemas = Object.fromEntries(
    query(`select id, json_schema, ui_schema from form_schema
           where id in (select form_schema_id from document_registry union select form_schema_id from document)`).map(
      s => [s.id, s]
    )
  );
  const parse = text => (text ? JSON.parse(text) : null);

  say('# Form take-over inventory\n');
  say(
    `From \`${process.env.PGDATABASE ?? '(PGDATABASE)'}\`, read-only. Produced by \`pnpm forms:inventory report\` (frontend/scripts/forms-inventory.mjs).\n`
  );

  say('## Registry entries\n');
  say(
    table(
      [
        'Document type',
        'Category',
        'Program (context)',
        'Name',
        'Current schema',
        'Event rules',
        'Entry id',
      ],
      registry.map(r => [
        `\`${r.document_type}\``,
        r.category,
        r.context,
        r.name,
        `\`${r.form_schema_id}\``,
        r.has_config
          ? `${JSON.parse(r.config)?.events?.length ?? 0} event(s)`
          : 'none',
        `\`${r.id}\``,
      ])
    )
  );
  const patientEntries = registry.filter(r => r.category === 'PATIENT');
  if (patientEntries.length > 1)
    say(
      `\n**Install will refuse a Patient take-over:** install allows one Patient-category entry per server, and there are ${patientEntries.length}: ${patientEntries.map(r => `\`${r.document_type}\` (\`${r.id}\`)`).join(', ')}.`
    );
  const byType = Object.groupBy(registry, r => r.document_type);
  for (const [type, entries] of Object.entries(byType))
    if (entries.length > 1)
      say(
        `\n**\`${type}\` has ${entries.length} registry entries**; a take-over expects one.`
      );
  const bySchema = Object.groupBy(registry, r => r.form_schema_id);
  for (const [schemaId, entries] of Object.entries(bySchema))
    if (entries.length > 1)
      say(
        `\n**${entries.length} registry entries share the schema \`${schemaId}\`**: ${entries.map(r => `\`${r.document_type}\``).join(', ')}. A plugin taking them over declares that id on each, with the same schema file.`
      );

  say('\n## Schema versions the records are on\n');
  say(
    table(
      [
        'Document type',
        'Schema id',
        'Documents',
        'Saved versions',
        'Patients',
        'First saved',
        'Last saved',
        'Registry current',
        'Schema held',
      ],
      pinned.map(p => [
        `\`${p.type}\``,
        `\`${p.form_schema_id}\``,
        p.documents,
        p.rows,
        p.patients,
        p.first_saved,
        p.last_saved,
        registry.some(r => r.form_schema_id === p.form_schema_id) ? 'yes' : '',
        p.schema_held ? 'yes' : '**no**',
      ])
    )
  );
  say(
    '\nA type with one schema id may still hold several schemas: the push scripts overwrite a schema under the same id, so check the fields below.'
  );

  say('\n## Programs\n');
  say(
    table(
      [
        'Program',
        'Program id',
        'Context',
        'Immunisation',
        'Registry types in it',
      ],
      programs.map(p => [
        p.name,
        `\`${p.id}\``,
        p.context_id === p.id ? '(same id)' : `\`${p.context_id}\``,
        p.is_immunisation ? 'yes' : '',
        p.registry_types,
      ])
    )
  );

  say('\n## Fields records hold that their schema does not declare\n');
  const undeclared = query(PATHS_SQL)
    .map(row => {
      const schema = parse(schemas[row.schema_id]?.json_schema);
      if (!schema) return null;
      const at = schemaAt(schema, row.path);
      return at === null ? row : null;
    })
    .filter(Boolean)
    // A child of an undeclared object is undeclared too; list the object only.
    .filter(
      (row, _i, all) =>
        !all.some(
          o =>
            o !== row &&
            o.type === row.type &&
            o.schema_id === row.schema_id &&
            row.path.startsWith(`${o.path}.`)
        )
    );
  say(
    undeclared.length
      ? table(
          ['Document type', 'Schema id', 'Path', 'Documents'],
          undeclared.map(u => [
            `\`${u.type}\``,
            `\`${u.schema_id}\``,
            `\`${u.path}\``,
            u.documents,
          ])
        )
      : 'None.'
  );
  say(
    '\nThe schemas do not close their properties, so these are valid and the old client keeps them on save. The plugin keeps them too unless a migration moves them; look at when they were last written before deciding.'
  );

  const outDir = flag('out');
  if (outDir) {
    for (const r of registry) {
      const s = schemas[r.form_schema_id];
      if (!s) continue;
      const dir = path.join(outDir, r.document_type);
      mkdirSync(dir, { recursive: true });
      writeFileSync(
        path.join(dir, `schema-${r.form_schema_id}.json`),
        JSON.stringify(parse(s.json_schema), null, 2) + '\n'
      );
      if (s.ui_schema)
        writeFileSync(
          path.join(dir, `ui-${r.form_schema_id}.json`),
          JSON.stringify(parse(s.ui_schema), null, 2) + '\n'
        );
    }
    say(
      `\nEach entry's deployed JSON Schema and UI schema are written under \`${outDir}\`.`
    );
  }

  const plugin = flag('plugin');
  if (plugin) pluginChecks(plugin, { registry, pinned, schemas, parse, say });

  process.stdout.write(out.join('\n') + '\n');
};

const pluginChecks = (plugin, { registry, pinned, schemas, parse, say }) => {
  const formsDir = path.join(plugin, 'forms');
  const declaration = JSON.parse(
    readFileSync(path.join(formsDir, 'forms.json'), 'utf8')
  );
  say(`\n## The plugin against the deployment: \`${plugin}\`\n`);
  const deployedTypes = new Set(registry.map(r => r.document_type));
  for (const t of declaration.documentTypes) {
    say(`### \`${t.documentType}\`\n`);
    const entry = registry.find(r => r.document_type === t.documentType);
    if (!entry) {
      say(
        `- **No registry entry has this document type.** A take-over matches on it, so install would add a new, empty type beside the deployment's. Deployed types: ${[...deployedTypes].map(x => `\`${x}\``).join(', ')}.\n`
      );
      continue;
    }
    if (entry.name !== t.name)
      say(
        `- Name: the plugin's "${t.name}", the deployment's "${entry.name}"; install writes the plugin's.`
      );
    const declared = t.versions.map(v => v.id).filter(Boolean);
    for (const p of pinned.filter(p => p.type === t.documentType))
      if (!declared.includes(p.form_schema_id))
        say(
          `- **Records on \`${p.form_schema_id}\` (${p.documents}) are on a version the plugin does not declare**; install refuses it.`
        );
    if (!declared.includes(entry.form_schema_id))
      say(
        `- **The entry's current schema \`${entry.form_schema_id}\` is not declared**; install refuses the take-over.`
      );
    for (const v of t.versions.filter(v => v.id)) {
      const deployed = parse(schemas[v.id]?.json_schema);
      if (!deployed) continue;
      const file = parse(
        readFileSync(path.join(formsDir, t.dir, v.file), 'utf8')
      );
      say(
        `- \`${v.file}\` (\`${v.id}\`): ${sameData(file, deployed) ? 'the same as deployed' : '**differs from what is deployed**'}.`
      );
    }
    if (t.legacyUiSchema) {
      const deployedUi = parse(schemas[entry.form_schema_id]?.ui_schema);
      const file = parse(
        readFileSync(path.join(formsDir, t.dir, t.legacyUiSchema), 'utf8')
      );
      say(
        `- \`${t.legacyUiSchema}\`: ${sameData(file, deployedUi) ? "the same as the deployment's current UI schema" : "**differs from the deployment's current UI schema**, so the old client's form would change"}.`
      );
    }
    const hasRules = entry.has_config;
    if (hasRules !== Boolean(t.events || t.nextEncounter))
      say(
        `- Event rules: the deployment's entry ${hasRules ? 'has' : 'has none'}, the plugin ${t.events || t.nextEncounter ? 'declares some' : 'declares none'}; install refuses a take-over whose config differs.`
      );

    const current = t.versions.at(-1);
    const currentSchema = parse(
      readFileSync(path.join(formsDir, t.dir, current.file), 'utf8')
    );
    const checks = constrainedStrings(currentSchema);
    for (const c of checks) {
      const ok = c.pattern
        ? `s ~ ${lit(c.pattern)}`
        : `s = any(array[${c.enum.map(lit).join(', ')}])`;
      const [row] = query(`
        select count(*) as values, count(*) filter (where not (${ok})) as failing
        from (select v #>> '{}' as s from latest_document d, jsonb_path_query(d.data::jsonb, ${lit(jsonPath(c.path))}) v
              where d.type = ${lit(t.documentType)} and jsonb_typeof(v) = 'string') x`);
      if (Number(row.failing) === 0) continue;
      const shapes = query(`
        select length(s) as length,
               case when s ~ '^[0-9]+$' then 'digits' when s ~ '^[0-9 ]+$' then 'digits and spaces'
                    when s ~ '^[+]?[0-9 ]+$' then 'leading +' else 'other characters' end as characters,
               count(*) as values
        from (select v #>> '{}' as s from latest_document d, jsonb_path_query(d.data::jsonb, ${lit(jsonPath(c.path))}) v
              where d.type = ${lit(t.documentType)} and jsonb_typeof(v) = 'string') x
        where not (${ok}) group by 1, 2 order by 3 desc limit 6`);
      say(
        `- **The current version would refuse ${row.failing} of ${row.values} values at \`${c.path}\`** (${c.pattern ? `pattern \`${c.pattern}\`` : `enum of ${c.enum.length}`}); most common: ${shapes.map(s => `${s.values} × ${s.length} ${s.characters}`).join(', ')}. The form refuses to save such a record until the value is changed.`
      );
    }
    say('');
  }
  const undeclaredTypes = [...deployedTypes].filter(
    d => !declaration.documentTypes.some(t => t.documentType === d)
  );
  if (undeclaredTypes.length)
    say(
      `Deployed types the plugin does not declare: ${undeclaredTypes.map(x => `\`${x}\``).join(', ')}.`
    );
};

// ── pick ───────────────────────────────────────────────────────────────────

const pick = () => {
  const type = flag('type') ?? fail('pick needs --type <documentType>');
  const where = flag('where') ?? 'true';
  const limit = Number(flag('limit') ?? 5);
  const names = flags['with-names'];
  const rows = query(`
    select d.id as document_id, d.name as document_name, nl.name_id as patient_id,
           ${names ? "n.last_name || ', ' || n.first_name as patient," : ''}
           coalesce(
             (select pe.store_id from program_enrolment pe where pe.patient_link_id = d.owner_name_link_id order by pe.enrolment_datetime desc limit 1),
             (select e.store_id from encounter e where e.patient_link_id = d.owner_name_link_id order by e.start_datetime desc limit 1),
             (select j.store_id from name_store_join j where j.name_link_id = d.owner_name_link_id limit 1)) as store_id,
           (select e.id from encounter e where e.document_name = d.name) as encounter_id,
           d.datetime::date as saved,
           (select count(*) from document v where v.name = d.name) as versions
    from latest_document d
    join name_link nl on nl.id = d.owner_name_link_id
    join name n on n.id = nl.name_id,
    lateral (select d.data::jsonb as j) x
    where d.type = ${lit(type)} and (${where})
    order by d.datetime desc limit ${limit}`);
  const stores = Object.fromEntries(
    query('select id, code from store').map(s => [s.id, s.code])
  );
  process.stdout.write(
    table(
      [
        'Document id',
        ...(names ? ['Patient'] : []),
        'Patient id',
        'Store',
        'Encounter id',
        'Saved',
        'Versions',
      ],
      rows.map(r => [
        `\`${r.document_id}\``,
        ...(names ? [r.patient] : []),
        `\`${r.patient_id}\``,
        `${stores[r.store_id] ?? ''} \`${r.store_id ?? ''}\``,
        r.encounter_id ? `\`${r.encounter_id}\`` : '',
        r.saved,
        r.versions,
      ])
    ) + '\n'
  );
};

// ── fixture ────────────────────────────────────────────────────────────────

const fixture = () => {
  const doc = flag('doc') ?? fail('fixture needs --doc <document id>');
  const outFile = flag('out') ?? fail('fixture needs --out <file>');
  const keep = new Set(flags.keep ?? []);
  const [row] = query(
    `select d.data, f.json_schema from document d left join form_schema f on f.id = d.form_schema_id where d.id = ${lit(doc)}`
  );
  if (!row) fail(`no document ${doc}`);
  const data = typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
  const schema = row.json_schema ? JSON.parse(row.json_schema) : {};
  const kept = new Set();
  const replaced = new Set();

  const anonymise = (value, dotted) => {
    if (Array.isArray(value))
      return value.map(v => anonymise(v, `${dotted}[]`));
    if (value && typeof value === 'object')
      return Object.fromEntries(
        Object.entries(value).map(([k, v]) => [
          k,
          anonymise(v, dotted ? `${dotted}.${k}` : k),
        ])
      );
    if (typeof value !== 'string') {
      kept.add(dotted);
      return value;
    }
    const nodes = schemaAt(schema, dotted);
    const restricted =
      Array.isArray(nodes) && nodes.some(n => n.enum || n.const !== undefined);
    if (keep.has(dotted) || restricted || /^[A-Z][A-Z0-9_]*$/.test(value)) {
      kept.add(dotted);
      return value;
    }
    replaced.add(dotted);
    const format = Array.isArray(nodes)
      ? nodes.find(n => n.format)?.format
      : undefined;
    if (format === 'date' || /^\d{4}-\d{2}-\d{2}$/.test(value))
      return '2000-01-01';
    if (format === 'date-time' || /^\d{4}-\d{2}-\d{2}T/.test(value))
      return '2000-01-01T00:00:00.000Z';
    if (/^[+0-9 ]+$/.test(value)) return value.replace(/[0-9]/g, '1');
    return 'fixture';
  };

  const result = anonymise(data, '');
  writeFileSync(outFile, JSON.stringify(result, null, 2) + '\n');
  process.stdout.write(
    `wrote ${outFile}\nkept as recorded: ${[...kept].sort().join(', ') || '(none)'}\nreplaced: ${[...replaced].sort().join(', ') || '(none)'}\n` +
      'Read it before committing: a free-text field the schema does not mark (a name in a note, say) is replaced, but check nothing personal was kept with --keep.\n'
  );
};

const commands = { report, pick, fixture };
(
  commands[command] ??
  (() =>
    fail(
      'usage: pnpm forms:inventory report|pick|fixture (see the header of frontend/scripts/forms-inventory.mjs)'
    ))
)();
