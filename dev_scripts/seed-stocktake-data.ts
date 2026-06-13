/**
 * Seeds a local open-mSupply Postgres DB with N items + stock + a ready N-line
 * stocktake, for development and performance testing (e.g. the 5,000-line
 * stocktake render challenge). Reads DB connection from the server's local.yaml.
 *
 * Usage (from dev_scripts/):
 *   yarn seed                 # 5000 items into the General Warehouse (GEN) store
 *   yarn seed 10000           # custom count
 *   yarn seed --store=GRY     # different store (by code)
 *   yarn seed:clean           # remove everything this script created (seed-% ids)
 *
 * Inserts directly via SQL (set-based generate_series, idempotent via ON CONFLICT).
 * All rows use deterministic `seed-*` ids so re-running is a no-op and --clean is exact.
 *
 * NOTE: this server is configured as a central server, so seeded data would sync to
 * any connected remote sites. Intended for isolated local dev DBs.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';
import pg from 'pg';

const scriptDir = dirname(fileURLToPath(import.meta.url));

const args = process.argv.slice(2);
const clean = args.includes('--clean');
const storeCode = args.find(a => a.startsWith('--store='))?.split('=')[1] ?? 'GEN';
const count = Number(args.find(a => /^\d+$/.test(a)) ?? 5000);

const ID = {
  item: (g: string) => `seed-item-${g}`,
  stock: 'seed-stock-',
  stocktakeLine: 'seed-stline-',
  stocktake: `seed-stocktake-${storeCode}`,
};

interface LocalConfig {
  database: {
    host: string;
    port: number;
    username: string;
    password: string;
    database_name: string;
  };
}

function loadDbConfig() {
  const path = resolve(scriptDir, '../server/configuration/local.yaml');
  const cfg = parseYaml(readFileSync(path, 'utf8')) as LocalConfig;
  const d = cfg.database;
  return {
    host: d.host,
    port: d.port,
    user: d.username,
    password: d.password,
    database: d.database_name,
  };
}

async function cleanup(client: pg.Client) {
  await client.query('BEGIN');
  try {
    await client.query(`DELETE FROM stocktake_line WHERE id LIKE '${ID.stocktakeLine}%'`);
    await client.query(`DELETE FROM stocktake WHERE id LIKE 'seed-stocktake-%'`);
    await client.query(`DELETE FROM reason_option WHERE id LIKE 'seed-reason-%'`);
    await client.query(`DELETE FROM stock_line WHERE id LIKE '${ID.stock}%'`);
    await client.query(`DELETE FROM item_link WHERE id LIKE 'seed-item-%'`);
    await client.query(`DELETE FROM item WHERE id LIKE 'seed-item-%'`);
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  }
  console.log('Removed all seeded rows (seed-* ids).');
}

async function resolveOne(
  client: pg.Client,
  sql: string,
  params: unknown[],
  what: string,
): Promise<string> {
  const res = await client.query(sql, params);
  if (res.rowCount === 0) throw new Error(`Could not resolve ${what}`);
  return res.rows[0].id as string;
}

async function seed(client: pg.Client) {
  const storeId = await resolveOne(
    client,
    `SELECT s.id FROM store s
       JOIN name_link nl ON nl.id = s.name_link_id
       JOIN name n ON n.id = nl.name_id
      WHERE s.code = $1`,
    [storeCode],
    `store with code "${storeCode}"`,
  );
  const userId = await resolveOne(
    client,
    `SELECT id FROM user_account ORDER BY (username ILIKE 'admin') DESC LIMIT 1`,
    [],
    'a user_account',
  );
  const unitRes = await client.query(
    `SELECT id FROM unit ORDER BY (name = 'Units') DESC LIMIT 1`,
  );
  const unitId: string | null = unitRes.rows[0]?.id ?? null;

  const started = Date.now();
  await client.query('BEGIN');
  try {
    // Inventory-adjustment reasons, shown on the stocktake when counted != snapshot.
    await client.query(
      `INSERT INTO reason_option (id,type,is_active,reason) VALUES
         ('seed-reason-pos-found',   'POSITIVE_INVENTORY_ADJUSTMENT', true, 'Stock found'),
         ('seed-reason-pos-recount', 'POSITIVE_INVENTORY_ADJUSTMENT', true, 'Recount correction (increase)'),
         ('seed-reason-pos-return',  'POSITIVE_INVENTORY_ADJUSTMENT', true, 'Returned to stock'),
         ('seed-reason-neg-damaged', 'NEGATIVE_INVENTORY_ADJUSTMENT', true, 'Damaged'),
         ('seed-reason-neg-expired', 'NEGATIVE_INVENTORY_ADJUSTMENT', true, 'Expired'),
         ('seed-reason-neg-stolen',  'NEGATIVE_INVENTORY_ADJUSTMENT', true, 'Stolen / lost'),
         ('seed-reason-neg-recount', 'NEGATIVE_INVENTORY_ADJUSTMENT', true, 'Recount correction (decrease)')
       ON CONFLICT (id) DO NOTHING`,
    );
    await client.query(
      `INSERT INTO item (id,name,code,type,default_pack_size,legacy_record,unit_id,is_active,is_vaccine,vaccine_doses,volume_per_pack)
       SELECT 'seed-item-'||g, 'Test Item '||g, 'SEED-'||lpad(g::text,5,'0'), 'STOCK', 1, '', $2, true, false, 0, 0
       FROM generate_series(1,$1) g
       ON CONFLICT (id) DO NOTHING`,
      [count, unitId],
    );
    await client.query(
      `INSERT INTO item_link (id,item_id)
       SELECT 'seed-item-'||g, 'seed-item-'||g FROM generate_series(1,$1) g
       ON CONFLICT (id) DO NOTHING`,
      [count],
    );
    await client.query(
      `INSERT INTO stock_line (id,store_id,item_link_id,pack_size,available_number_of_packs,total_number_of_packs,cost_price_per_pack,sell_price_per_pack,on_hold,batch,expiry_date,total_volume,volume_per_pack)
       SELECT 'seed-stock-'||g, $2, 'seed-item-'||g,
         (g%10)+1, (g%200)+1, (g%200)+1, ((g%50)+1)::float, (((g%50)+1)*1.2)::float, false,
         'B'||lpad(g::text,5,'0'), (CURRENT_DATE + (g%1000))::date, 0, 0
       FROM generate_series(1,$1) g
       ON CONFLICT (id) DO NOTHING`,
      [count, storeId],
    );
    await client.query(
      `INSERT INTO stocktake (id,store_id,user_id,stocktake_number,status,created_datetime,description,is_initial_stocktake,is_locked)
       VALUES ($1,$2,$3,(SELECT COALESCE(MAX(stocktake_number),0)+1 FROM stocktake WHERE store_id=$2),'NEW',now()::timestamp,$4,false,false)
       ON CONFLICT (id) DO NOTHING`,
      [ID.stocktake, storeId, userId, `Perf test stocktake (${count} lines)`],
    );
    await client.query(
      `INSERT INTO stocktake_line (id,stocktake_id,stock_line_id,item_link_id,item_name,snapshot_number_of_packs,counted_number_of_packs,pack_size,batch,expiry_date,cost_price_per_pack,sell_price_per_pack,volume_per_pack)
       SELECT 'seed-stline-'||g, $1, 'seed-stock-'||g, 'seed-item-'||g, 'Test Item '||g,
         (g%200)+1, NULL, (g%10)+1, 'B'||lpad(g::text,5,'0'), (CURRENT_DATE + (g%1000))::date,
         ((g%50)+1)::float, (((g%50)+1)*1.2)::float, 0
       FROM generate_series(1,$2) g
       ON CONFLICT (id) DO NOTHING`,
      [ID.stocktake, count],
    );
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  }

  console.log(
    `Seeded ${count} items + stock + a ${count}-line stocktake in ${Date.now() - started}ms`,
  );
  console.log(`  store:        ${storeCode} (${storeId})`);
  console.log(`  stocktake id: ${ID.stocktake}`);
  console.log(`  open:         http://localhost:3004/stocktake/${ID.stocktake}`);
}

async function main() {
  const client = new pg.Client(loadDbConfig());
  await client.connect();
  console.log(`Connected to ${client.database} @ ${(client as unknown as { host: string }).host}`);
  try {
    if (clean) await cleanup(client);
    else await seed(client);
  } finally {
    await client.end();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
