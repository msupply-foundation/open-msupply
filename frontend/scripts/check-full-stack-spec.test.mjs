import { describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import {
  check,
  codeTables,
  dataTables,
  exportedProposals,
  isFullStack,
  sdlNames,
  section,
} from './check-full-stack-spec.mjs';

const FULL = '> **Scope: full stack.** Specifies the whole area.';
const FRONT = '> **Scope: front end.** Specifies the front end.';

/** A repo with spec/, server/schema.graphql and server/repository/src. */
const fakeRepo = files => {
  const root = mkdtempSync(join(tmpdir(), 'full-stack-spec-'));
  for (const [path, body] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), body);
  }
  return check({
    specDir: join(root, 'spec'),
    schemaPath: join(root, 'server/schema.graphql'),
    repositoryDir: join(root, 'server/repository/src'),
  });
};

const SCHEMA = `type Queries {
  procurements(storeId: String!, filter: ProcurementFilterInput): ProcurementsResponse!
}
type Mutations {
  insertLocation(storeId: String!, input: InsertLocationInput!): InsertLocationResponse!
}
type LocationNode {
  id: String!
}
`;

const contract = ({ proposed = '', data = '' }) =>
  `# Contract\n\n## A rule\n\nMapping.\n\n## Proposed API\n\n${proposed}\n\n## Data\n\n${data}\n\n## Contract surface (index)\n`;

const PROCUREMENT_TABLE = `### \`procurement\`

| Column | Type | Null | References | Serves |
| --- | --- | --- | --- | --- |
| \`id\` | id | no | | |
| \`store_id\` | id | no | \`store\` | |
| \`comment\` | text | yes | | |
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

describe('section', () => {
  it('stops at the next level-two heading outside a code fence', () => {
    const md =
      '## Data\n\nrows\n```graphql\n## not a heading\n```\n## Sync\n\nx';
    expect(section(md, 'Data')).toContain('## not a heading');
    expect(section(md, 'Data')).not.toContain('x');
    expect(section(md, 'Permissions')).toBeNull();
  });
});

describe('sdlNames', () => {
  it('collects type definitions and root fields, not extended types', () => {
    const { types, roots } = sdlNames(`
      type ProcurementNode { id: String! }
      input InsertProcurementInput { name: String }
      extend type Mutations {
        insertProcurement(
          storeId: String!
          input: InsertProcurementInput!
        ): InsertProcurementResponse!
      }
      extend type Queries { procurement(id: String!): ProcurementNode }
    `);
    expect([...types]).toEqual(['ProcurementNode', 'InsertProcurementInput']);
    expect([...roots.Mutations]).toEqual(['insertProcurement']);
    expect([...roots.Queries]).toEqual(['procurement']);
  });
});

describe('exportedProposals (C10)', () => {
  it('names each proposed type or operation the schema already has', () => {
    const proposed = `
      type LocationNode { id: String! }
      type ProcurementNode { id: String! }
      extend type Queries { procurements(storeId: String!): ProcurementsResponse! }
      extend type Mutations { insertProcurement(storeId: String!): Boolean }
    `;
    expect(exportedProposals(proposed, SCHEMA)).toEqual([
      'LocationNode',
      'Queries.procurements',
    ]);
  });
});

describe('dataTables', () => {
  it('reads each table heading, its columns and Null', () => {
    const tables = dataTables(PROCUREMENT_TABLE);
    expect([...tables.keys()]).toEqual(['procurement']);
    expect([...tables.get('procurement')]).toEqual([
      ['id', false],
      ['store_id', false],
      ['comment', true],
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
  const vertical = (contractText, scope = FULL) => ({
    'spec/procurement/README.md': `# Procurement\n\n${scope}\n`,
    'spec/procurement/contract.md': contractText,
    'server/schema.graphql': SCHEMA,
  });

  it('passes when every built table matches and nothing proposed is exported', () => {
    const result = fakeRepo({
      ...vertical(contract({ data: PROCUREMENT_TABLE })),
      'server/repository/src/db_diesel/procurement_row.rs': PROCUREMENT_ROW,
    });
    expect(result.problems).toEqual([]);
    expect(result.tablesChecked).toBe(1);
  });

  it('lists a table the code has no definition of as not built, without failing', () => {
    const result = fakeRepo(vertical(contract({ data: PROCUREMENT_TABLE })));
    expect(result.problems).toEqual([]);
    expect(result.notBuilt).toEqual(['procurement: procurement']);
  });

  it('fails on a column missing from either side or with different Null (C9)', () => {
    const result = fakeRepo({
      ...vertical(contract({ data: PROCUREMENT_TABLE })),
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

  it("ignores a migration's partial copy of a table", () => {
    const result = fakeRepo({
      ...vertical(contract({ data: PROCUREMENT_TABLE })),
      'server/repository/src/migrations/v3_05_00/mod.rs':
        'table! { procurement (id) { id -> Text, } }',
    });
    expect(result.notBuilt).toEqual(['procurement: procurement']);
  });

  it('fails on a proposed name the schema exports (C10)', () => {
    const proposed =
      '```graphql\nextend type Mutations { insertLocation(storeId: String!): Boolean }\n```';
    const result = fakeRepo(
      vertical(contract({ proposed, data: PROCUREMENT_TABLE }))
    );
    expect(result.problems).toEqual([
      'procurement: Proposed API still declares Mutations.insertLocation, which schema.graphql exports — delete its block (C10)',
    ]);
  });

  it('fails when a full-stack contract has no Data section', () => {
    const result = fakeRepo(vertical('# Contract\n\n## A rule\n'));
    expect(result.problems).toEqual([
      'procurement: full stack, but contract.md has no Data section',
    ]);
  });

  it('skips front-end verticals', () => {
    const result = fakeRepo(vertical('# Contract\n', FRONT));
    expect(result.verticals).toEqual([]);
    expect(result.problems).toEqual([]);
  });
});
