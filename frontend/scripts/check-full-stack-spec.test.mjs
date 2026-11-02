import { describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import {
  check,
  codeTables,
  dataTables,
  isFullStack,
} from './check-full-stack-spec.mjs';

const FULL = '> **Scope: full stack.** Specifies the whole area.';
const FRONT = '> **Scope: front end.** Specifies the front end.';

/** A repo with spec/ and server/repository/src. */
const fakeRepo = files => {
  const root = mkdtempSync(join(tmpdir(), 'full-stack-spec-'));
  for (const [path, body] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), body);
  }
  return check({
    specDir: join(root, 'spec'),
    repositoryDir: join(root, 'server/repository/src'),
  });
};

const PROCUREMENT_TABLE = `## \`procurement\`

A procurement is its own table, not an invoice type: it has no stock lines.

| Column | Type | Null | References | Serves |
| --- | --- | --- | --- | --- |
| \`id\` | id | no | | |
| \`store_id\` | id | no | \`store\` | |
| \`comment\` | text | yes | | |

**Sync:** authored on the store's site; reaches that site only; v7.
`;

const PROCUREMENT_ROW = `table! {
    procurement (id) {
        id -> Text,
        store_id -> Text,
        comment -> Nullable<Text>,
    }
}
`;

describe('isFullStack', () => {
  it('reads the scope line under the heading', () => {
    expect(isFullStack(`# Procurement\n\n${FULL}\n`)).toBe(true);
    expect(isFullStack(`# Stocktakes\n\n${FRONT}\n`)).toBe(false);
    expect(isFullStack(`# Procurement\n\nIntro.\n\n${FULL}\n`)).toBe(false);
  });
});

describe('dataTables', () => {
  it('reads each table heading, its columns and Null', () => {
    const tables = dataTables(PROCUREMENT_TABLE);
    expect([...tables.keys()]).toEqual(['procurement']);
    expect(tables.get('procurement').existing).toBe(false);
    expect([...tables.get('procurement').columns]).toEqual([
      ['id', false],
      ['store_id', false],
      ['comment', true],
    ]);
  });

  it('marks an extended table, and stops at a heading that is not a table', () => {
    const tables = dataTables(`## \`invoice\` (existing)

| Column | Type | Null | References | Serves |
| --- | --- | --- | --- | --- |
| \`procurement_id\` | id | yes | \`procurement\` | |

## Permissions

| Action | Permission | Granted |
| --- | --- | --- |
| Create a procurement | \`ProcurementMutate\` | central server |
`);
    expect([...tables.keys()]).toEqual(['invoice']);
    expect(tables.get('invoice').existing).toBe(true);
    expect([...tables.get('invoice').columns]).toEqual([
      ['procurement_id', true],
    ]);
  });
});

describe('codeTables', () => {
  it('reads table! with sql names, and skips comments and macro templates', () => {
    const tables = codeTables(`
      // table! { ghost (id) { id -> Text, } }
      table! {
          #[sql_name = "procurement_line"]
          procurement_line_row (id) {
              id -> Text,
              #[sql_name = "type"] type_ -> crate::LineTypeMapping,
              price -> Nullable<Double>,
          }
      }
      table! { $core_table (id) { id -> Text, } }
    `);
    expect([...tables.keys()]).toEqual(['procurement_line']);
    expect([...tables.get('procurement_line')]).toEqual([
      ['id', false],
      ['type', false],
      ['price', true],
    ]);
  });

  it('reads define_linked_tables! as its stored core table', () => {
    const tables = codeTables(`
      define_linked_tables! {
          view: quote = "quote_view",
          core: quote_with_links = "quote",
          struct: QuoteRow,
          repo: QuoteRowRepository,
          shared: {
              procurement_id -> Text,
              note -> Nullable<Text>,
          },
          links: {
              name_link_id -> name_id,
          },
          optional_links: {
              item_link_id -> item_id,
          }
      }
    `);
    expect([...tables.get('quote')]).toEqual([
      ['id', false],
      ['procurement_id', false],
      ['note', true],
      ['name_link_id', false],
      ['item_link_id', true],
    ]);
  });
});

describe('check', () => {
  const vertical = (dataText, scope = FULL) => ({
    'spec/procurement/README.md': `# Procurement\n\n${scope}\n`,
    'spec/procurement/data.md': dataText,
  });

  it('passes when every built table matches', () => {
    const result = fakeRepo({
      ...vertical(PROCUREMENT_TABLE),
      'server/repository/src/db_diesel/procurement_row.rs': PROCUREMENT_ROW,
    });
    expect(result.problems).toEqual([]);
    expect(result.tablesChecked).toBe(1);
  });

  it('lists a table the code has no definition of as not built, without failing', () => {
    const result = fakeRepo(vertical(PROCUREMENT_TABLE));
    expect(result.problems).toEqual([]);
    expect(result.notBuilt).toEqual(['procurement: procurement']);
  });

  it('fails on a column missing from either side or with different Null (C9)', () => {
    const result = fakeRepo({
      ...vertical(PROCUREMENT_TABLE),
      'server/repository/src/db_diesel/procurement_row.rs': `table! {
          procurement (id) {
              id -> Text,
              store_id -> Nullable<Text>,
              status -> Text,
          }
      }`,
    });
    expect(result.problems).toEqual([
      'procurement: procurement.store_id is not nullable in the spec but nullable in the code (C9)',
      'procurement: procurement.comment is in the spec but not the code (C9)',
      'procurement: procurement.status is in the code but not the spec (C9)',
    ]);
  });

  it('compares only the added columns of an extended table', () => {
    const extended = `## \`invoice\` (existing)

| Column | Type | Null | References | Serves |
| --- | --- | --- | --- | --- |
| \`procurement_id\` | id | yes | \`procurement\` | |
`;
    const invoice = nullable => `table! {
        invoice (id) {
            id -> Text,
            name_link_id -> Text,
            procurement_id -> ${nullable ? 'Nullable<Text>' : 'Text'},
        }
    }`;
    const matches = fakeRepo({
      ...vertical(extended),
      'server/repository/src/db_diesel/invoice_row.rs': invoice(true),
    });
    expect(matches.problems).toEqual([]);
    const differs = fakeRepo({
      ...vertical(extended),
      'server/repository/src/db_diesel/invoice_row.rs': invoice(false),
    });
    expect(differs.problems).toEqual([
      'procurement: invoice.procurement_id is nullable in the spec but not nullable in the code (C9)',
    ]);
  });

  it("ignores a migration's partial copy of a table", () => {
    const result = fakeRepo({
      ...vertical(PROCUREMENT_TABLE),
      'server/repository/src/migrations/v3_05_00/mod.rs':
        'table! { procurement (id) { id -> Text, } }',
    });
    expect(result.notBuilt).toEqual(['procurement: procurement']);
  });

  it('fails on a full-stack vertical that has a contract.md', () => {
    const result = fakeRepo({
      ...vertical(PROCUREMENT_TABLE),
      'spec/procurement/contract.md': '# Contract\n',
    });
    expect(result.problems).toEqual([
      'procurement: a full-stack vertical has no contract.md — its tables go in data.md',
    ]);
  });

  it('lists a full-stack vertical with no data.md yet, without failing', () => {
    const result = fakeRepo({
      'spec/procurement/README.md': `# Procurement\n\n${FULL}\n`,
    });
    expect(result.problems).toEqual([]);
    expect(result.noData).toEqual(['procurement']);
  });

  it('skips front-end verticals', () => {
    const result = fakeRepo({
      ...vertical(PROCUREMENT_TABLE, FRONT),
      'spec/procurement/contract.md': '# Contract\n',
    });
    expect(result.verticals).toEqual([]);
    expect(result.problems).toEqual([]);
  });
});
