#!/usr/bin/env node
/*
 * Build a variant of the e2e reference datafile: the shared export plus an
 * OVERLAY — the central configuration one stack needs and the shared datafile
 * must not carry (e2e/README.md § Plugin profiles). A plugin profile's overlay
 * is what shapes its throwaway database like the deployment the plugin was
 * written for; the default suites never see it.
 *
 *   node scripts/e2e/apply-overlay.mjs <base dir> <overlay.json> <out dir>
 *
 * <base dir> holds export.json + users.txt (server/data/e2e); <out dir> gets
 * the merged export.json and a copy of users.txt, ready for
 * `remote_server_cli initialise-from-export -n <out dir's name>`.
 *
 * An overlay is JSON:
 *
 *   {
 *     "patch": [
 *       { "table_name": "reason_option", "set": { "is_active": false } },
 *       { "table_name": "item", "where": { "type": "Stock" },
 *         "except": { "code": ["098350"] }, "set": { "default_pack_size": 1 } }
 *     ],
 *     "upsert": [ <sync_buffer_rows, as in export.json> ]
 *   }
 *
 * `patch` edits the data of existing rows of one table: every row whose data
 * matches all of `where` (equality per field; omitted = every row), less any
 * matching `except` (field → list of values), gets `set` merged in. A patch
 * that changes nothing is an error — the shared datafile moved under it, and a
 * variant that silently stopped varying is worse than a red run.
 *
 * `upsert` adds rows, or replaces the row with the same table_name and
 * record_id. Rows are only ever added or edited, never removed: the restore
 * integrates the buffer in order, and a removal is better expressed as the
 * row's own inactive flag (as `reason_option.is_active` above), which is also
 * what the server reads.
 *
 * RELATIVE DATES. A date in an upserted row may be written relative to the
 * shared datafile instead of as a fixed day: `@datetime(-99)` / `@date(-99)`
 * resolve to 99 days before the newest timestamp the base export holds. The
 * restore's `--refresh` shifts every date by (now − that newest timestamp), so
 * a relative date lands the same distance before NOW after the restore —
 * whatever the shared datafile gains later. A fixed day would drift as soon as
 * someone added a newer row to it.
 *
 * Every entry may carry a "why" string — ignored here, required by review:
 * the overlay is the deployment's assumptions made concrete, and each entry
 * should say which one it is (plugins/<dir>/README.md § Deployment
 * assumptions).
 */
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const matches = (data, where = {}) =>
  Object.entries(where).every(([field, value]) => data[field] === value);

const excluded = (data, except = {}) =>
  Object.entries(except).some(([field, values]) =>
    values.includes(data[field])
  );

const ISO_DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
const RELATIVE = /^@(datetime|date)\((-?\d+)\)$/;

/** The newest timestamp anywhere in the base rows' data — the anchor the
 * restore's date refresh shifts everything by. */
export const newestTimestamp = base => {
  let newest = '';
  for (const row of base.sync_buffer_rows)
    for (const value of Object.values(row.data ?? {}))
      if (
        typeof value === 'string' &&
        ISO_DATETIME.test(value) &&
        value > newest
      )
        newest = value;
  if (!newest)
    throw new Error(
      'the base export holds no timestamp to anchor relative dates on'
    );
  return newest;
};

const resolveRelative = (data, anchor) =>
  Object.fromEntries(
    Object.entries(data).map(([field, value]) => {
      const m = typeof value === 'string' ? RELATIVE.exec(value) : null;
      if (!m) return [field, value];
      const at = new Date(`${anchor().slice(0, 19)}Z`);
      at.setUTCDate(at.getUTCDate() + Number(m[2]));
      const iso = at.toISOString(); // 2026-01-01T00:00:00.000Z
      return [field, m[1] === 'date' ? iso.slice(0, 10) : iso.slice(0, 19)];
    })
  );

/** Pure: the base export with the overlay applied. Throws on a no-op patch. */
export const applyOverlay = (base, overlay) => {
  const rows = base.sync_buffer_rows.map(row => ({
    ...row,
    data: { ...row.data },
  }));

  for (const [i, patch] of (overlay.patch ?? []).entries()) {
    if (!patch.table_name || !patch.set)
      throw new Error(`patch[${i}] needs table_name and set`);
    let changed = 0;
    for (const row of rows) {
      if (row.table_name !== patch.table_name) continue;
      if (!matches(row.data, patch.where) || excluded(row.data, patch.except))
        continue;
      Object.assign(row.data, patch.set);
      changed++;
    }
    if (!changed)
      throw new Error(
        `patch[${i}] (${patch.table_name}) matched no row — the shared datafile no longer has what this overlay edits`
      );
  }

  // Only a relative date needs the anchor, so only one asks for it.
  let anchorCache;
  const anchor = () => (anchorCache ??= newestTimestamp(base));
  const index = new Map(
    rows.map((r, i) => [`${r.table_name}/${r.record_id}`, i])
  );
  for (const [i, row] of (overlay.upsert ?? []).entries()) {
    if (!row.table_name || !row.record_id || !row.data)
      throw new Error(`upsert[${i}] needs table_name, record_id and data`);
    const key = `${row.table_name}/${row.record_id}`;
    // Shaped like the base's own rows, so the restore cannot tell them apart.
    const full = {
      ...base.sync_buffer_rows[0],
      ...row,
      data: resolveRelative(row.data, anchor),
    };
    if (index.has(key)) rows[index.get(key)] = full;
    else {
      index.set(key, rows.length);
      rows.push(full);
    }
  }

  return { ...base, sync_buffer_rows: rows };
};

const main = ([baseDir, overlayPath, outDir]) => {
  if (!baseDir || !overlayPath || !outDir) {
    console.error(
      'usage: apply-overlay.mjs <base dir> <overlay.json> <out dir>'
    );
    process.exit(2);
  }
  const base = JSON.parse(readFileSync(join(baseDir, 'export.json'), 'utf8'));
  const overlay = JSON.parse(readFileSync(overlayPath, 'utf8'));
  const merged = applyOverlay(base, overlay);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'export.json'), JSON.stringify(merged));
  copyFileSync(join(baseDir, 'users.txt'), join(outDir, 'users.txt'));
  console.log(
    `overlay: ${(overlay.patch ?? []).length} patch(es), ${(overlay.upsert ?? []).length} upsert(s) -> ${outDir}`
  );
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  main(process.argv.slice(2));
