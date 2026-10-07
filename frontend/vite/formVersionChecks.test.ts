import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';
import {
  parseFormsDeclaration,
  readFormsDeclaration,
  type FormsDeclaration,
} from './formPlugins.ts';
import { checkFormVersions } from './formVersionChecks.ts';

const demoDir = fileURLToPath(
  new URL('../plugins/examples/demo_program', import.meta.url)
);

// A throwaway plugin directory holding the given files.
const fixtures: string[] = [];
afterAll(() => {
  for (const dir of fixtures) rmSync(dir, { recursive: true, force: true });
});
const fixture = (files: Record<string, unknown>): string => {
  const dir = mkdtempSync(join(tmpdir(), 'form-versions-'));
  fixtures.push(dir);
  for (const [path, content] of Object.entries(files)) {
    if (content === undefined) continue;
    const full = join(dir, path);
    mkdirSync(join(full, '..'), { recursive: true });
    writeFileSync(
      full,
      typeof content === 'string' ? content : JSON.stringify(content)
    );
  }
  return dir;
};

// A document schema whose `extension.demo` has the given properties.
const schema = (demo: Record<string, unknown>) => ({
  type: 'object',
  properties: {
    extension: {
      type: 'object',
      properties: { demo: { type: 'object', properties: demo } },
    },
  },
});

const v1 = schema({
  weightKg: { type: 'number' },
  regimen: { type: 'string', enum: ['FIRST_LINE', 'LEGACY_TRIAL'] },
});
const v2 = schema({
  vitals: { type: 'object', properties: { weightKg: { type: 'number' } } },
  regimen: { type: 'string', enum: ['FIRST_LINE'] },
});
const v1Document = {
  extension: { demo: { weightKg: 68, regimen: 'LEGACY_TRIAL' } },
};

// A migrations.ts importing the SDK, as a plugin's does.
const migrationsFile = (map: string) => `
  import { defineMigration } from '@openmsupply/plugin-sdk';
  export const migrations = [
    defineMigration({
      from: 1,
      moved: { 'extension.demo.weightKg': 'extension.demo.vitals.weightKg' },
      ${map}
    }),
  ];
`;
const covered = migrationsFile(
  "unresolved: { 'extension.demo.regimen': ['LEGACY_TRIAL'] },"
);

const declare = (entry: Record<string, unknown> = {}): FormsDeclaration =>
  parseFormsDeclaration(
    {
      programKeys: ['demo'],
      documentTypes: [
        {
          documentType: 'Visit',
          category: 'Custom',
          name: 'Visit',
          programKey: 'demo',
          versions: [
            { file: 'v1.json' },
            { file: 'v2.json', source: 'type.ts', type: 'Visit' },
          ],
          ...entry,
        },
      ],
    },
    'forms.json'
  );

const visit = (dir: string, path: string) => join(dir, 'forms/Visit', path);

describe('checkFormVersions', { timeout: 60_000 }, () => {
  it('passes the demo plugin', async () => {
    const declaration = readFormsDeclaration(demoDir);
    expect(declaration).toBeDefined();
    expect(
      await checkFormVersions(demoDir, declaration as FormsDeclaration)
    ).toEqual([]);
  });

  it('passes a covered migration whose fixture migrates to a valid document', async () => {
    const dir = fixture({
      'forms/Visit/v1.json': v1,
      'forms/Visit/v2.json': v2,
      'forms/Visit/migrations.ts': covered,
      'forms/Visit/fixtures/v1.json': v1Document,
    });
    expect(await checkFormVersions(dir, declare())).toEqual([]);
  });

  it('names an event-rule path the current schema does not have', async () => {
    const dir = fixture({
      'forms/Visit/v1.json': v2,
      'forms/Visit/events.json': [
        {
          type: 'Field',
          conditions: [{ field: 'extension.demo.regimen', isSet: true }],
          event: { type: 'currentRegimen', dataField: 'extension.demo.regimn' },
        },
      ],
    });
    const declaration = declare({
      versions: [{ file: 'v1.json', source: 'type.ts', type: 'Visit' }],
      events: 'events.json',
    });
    expect(await checkFormVersions(dir, declaration)).toEqual([
      `${visit(dir, 'events.json')} [0]: event.dataField ` +
        '"extension.demo.regimn" is not a field of v1 — name a field of the ' +
        'current schema',
    ]);
  });

  it("names a schedule's base field that is not a date-time", async () => {
    const scheduled = (format: string) => ({
      'forms/Visit/v1.json': schema({
        nextVisit: { type: 'string', format },
      }),
      'forms/Visit/events.json': [
        {
          type: 'Schedule',
          event: { type: 'followUp' },
          config: {
            datetimeField: 'extension.demo.nextVisit',
            scheduleIn: { days: 30 },
          },
        },
      ],
    });
    const declaration = declare({
      versions: [{ file: 'v1.json', source: 'type.ts', type: 'Visit' }],
      events: 'events.json',
    });

    const date = fixture(scheduled('date'));
    expect(await checkFormVersions(date, declaration)).toEqual([
      `${visit(date, 'events.json')} [0]: config.datetimeField ` +
        '"extension.demo.nextVisit" is not a date-time field of v1 (date) — ' +
        "the server would schedule from the document's own time; name a " +
        'field with `@format date-time`',
    ]);
    expect(
      await checkFormVersions(fixture(scheduled('date-time')), declaration)
    ).toEqual([]);
  });

  it('names a key of an event rule the server would ignore, at every level', async () => {
    const dir = fixture({
      'forms/Visit/v1.json': schema({
        nextVisit: { type: 'string', format: 'date-time' },
      }),
      'forms/Visit/events.json': [
        {
          type: 'Schedule',
          conditions: [{ field: 'extension.demo.nextVisit', isset: true }],
          event: { type: 'followUp', documenttype: 'DemoProgramEnrolment' },
          config: {
            datetimeFeild: 'extension.demo.nextVisit',
            scheduleIn: { day: 30 },
          },
          condition: [],
        },
      ],
    });
    const declaration = declare({
      versions: [{ file: 'v1.json', source: 'type.ts', type: 'Visit' }],
      events: 'events.json',
    });
    const at = `${visit(dir, 'events.json')} [0]:`;
    expect(await checkFormVersions(dir, declaration)).toEqual([
      `${at} the rule has unknown key "condition", which the server would ` +
        'ignore — the rule takes type, conditions, config, event',
      `${at} conditions[0] has unknown key "isset", which the server would ` +
        'ignore — conditions[0] takes field, isFalsy, isTruthy, isSet, ' +
        'equalTo, equalAny, lessThanOrEqualTo, lessThan, ' +
        'greaterThanOrEqualTo, greaterThan',
      `${at} event has unknown key "documenttype", which the server would ` +
        'ignore — event takes documentType, documentName, type, dataField, data',
      `${at} config has unknown key "datetimeFeild", which the server would ` +
        'ignore — config takes datetimeField, scheduleFromNow, scheduleIn',
      `${at} config.scheduleIn has unknown key "day", which the server would ` +
        'ignore — config.scheduleIn takes months, days, minutes',
    ]);
  });

  it('names a $ref that does not resolve, in a type with one version', async () => {
    const dir = fixture({
      'forms/Visit/v1.json': {
        type: 'object',
        properties: { weight: { $ref: '#/definitions/Measure%3Cnumbr%3E' } },
        definitions: { 'Measure<number>': { type: 'object' } },
      },
    });
    const declaration = declare({
      versions: [{ file: 'v1.json', source: 'type.ts', type: 'Visit' }],
    });
    expect(await checkFormVersions(dir, declaration)).toEqual([
      `${visit(dir, 'v1.json')}: $ref "#/definitions/Measure%3Cnumbr%3E" ` +
        'does not resolve within the schema, so the form and these checks ' +
        'cannot see the fields it names — fix the schema',
    ]);
  });

  it('names a missing fixture for an earlier version', async () => {
    const dir = fixture({
      'forms/Visit/v1.json': v1,
      'forms/Visit/v2.json': v2,
      'forms/Visit/migrations.ts': covered,
    });
    expect(await checkFormVersions(dir, declare())).toEqual([
      expect.stringMatching(
        new RegExp(
          `^${visit(dir, 'fixtures/v1.json')}: not found — every earlier ` +
            'version needs a fixture'
        )
      ),
    ]);
  });

  it("names a retired value the migration's coverage map leaves out", async () => {
    const dir = fixture({
      'forms/Visit/v1.json': v1,
      'forms/Visit/v2.json': v2,
      'forms/Visit/migrations.ts': migrationsFile(''),
      'forms/Visit/fixtures/v1.json': v1Document,
    });
    const problems = await checkFormVersions(dir, declare());
    expect(problems[0]).toBe(
      `${visit(dir, 'migrations.ts')}: v1 → v2: extension.demo.regimen ` +
        'value "LEGACY_TRIAL" is retired and not covered — add it to mapped ' +
        'or unresolved'
    );
    // And the fixture holding that value no longer fits the current schema.
    expect(problems[1]).toMatch(
      /fixtures\/v1\.json: migrated from v1 to v2, it does not validate against v2 \(v2\.json\): extension\.demo\.regimen \(enum\)/
    );
  });

  it('says a type needs a migrations.ts when a hop is not additive', async () => {
    const dir = fixture({
      'forms/Visit/v1.json': v1,
      'forms/Visit/v2.json': v2,
      'forms/Visit/fixtures/v1.json': v1Document,
    });
    const problems = await checkFormVersions(dir, declare());
    expect(problems).toContain(
      `${visit(dir, 'migrations.ts')}: not found, and v1 → v2 of Visit is ` +
        'not additive, so the type needs this file, with a step from v1 — ' +
        'v1 → v2: extension.demo.weightKg is removed and not covered — add ' +
        'it to moved, kept or dropped'
    );
  });

  it('passes an additive hop with no migration', async () => {
    const dir = fixture({
      'forms/Visit/v1.json': v2,
      'forms/Visit/v2.json': schema({
        ...v2.properties.extension.properties.demo.properties,
        notes: { type: 'string' },
      }),
      'forms/Visit/fixtures/v1.json': { extension: { demo: { vitals: {} } } },
    });
    expect(await checkFormVersions(dir, declare())).toEqual([]);
  });

  it('names a fixture that fails the current schema once migrated', async () => {
    const dir = fixture({
      'forms/Visit/v1.json': v1,
      'forms/Visit/v2.json': v2,
      // Mapped to a value v2 does not allow either.
      'forms/Visit/migrations.ts': migrationsFile(
        "mapped: { 'extension.demo.regimen': { LEGACY_TRIAL: 'SECOND_LINE' } },"
      ),
      'forms/Visit/fixtures/v1.json': v1Document,
    });
    expect(await checkFormVersions(dir, declare())).toEqual([
      `${visit(dir, 'fixtures/v1.json')}: migrated from v1 to v2, it does ` +
        'not validate against v2 (v2.json): extension.demo.regimen (enum) — ' +
        `fix the migration in ${visit(dir, 'migrations.ts')} (or the ` +
        'fixture, if it is not a document v1 could have recorded)',
    ]);
  });

  it("names a fixture that fails its category's base schema once migrated", async () => {
    const dir = fixture({
      'forms/Visit/v1.json': v1,
      'forms/Visit/v2.json': v2,
      'forms/Visit/migrations.ts': covered,
      // Valid under v1 and v2, neither of which requires the base fields.
      'forms/Visit/fixtures/v1.json': v1Document,
    });
    const problems = await checkFormVersions(
      dir,
      declare({ category: 'Encounter' })
    );
    expect(problems).toEqual([
      expect.stringMatching(
        /fixtures\/v1\.json: migrated from v1 to v2, it does not validate against the Encounter base schema, which the host checks every draft against as well: .*createdDatetime \(required\)/
      ),
    ]);
  });

  it('names a fixture that does not fit its own version', async () => {
    const dir = fixture({
      'forms/Visit/v1.json': v1,
      'forms/Visit/v2.json': v2,
      'forms/Visit/migrations.ts': covered,
      'forms/Visit/fixtures/v1.json': {
        extension: { demo: { weightKg: 'heavy' } },
      },
    });
    expect(await checkFormVersions(dir, declare())).toEqual([
      expect.stringMatching(
        /fixtures\/v1\.json: does not validate against v1 \(v1\.json\): extension\.demo\.weightKg \(type\)/
      ),
    ]);
  });

  it('checks an additive hop part-way along the chain against the fixture as it is', async () => {
    // v1 → v2 adds nothing but a requirement, so it has no step; v2 → v3 has one.
    const v2Required = {
      ...v1,
      properties: {
        extension: {
          type: 'object',
          properties: {
            demo: {
              ...v1.properties.extension.properties.demo,
              required: ['weightKg'],
            },
          },
        },
      },
    };
    const dir = fixture({
      'forms/Visit/v1.json': v1,
      'forms/Visit/v2.json': v2Required,
      'forms/Visit/v3.json': v2,
      'forms/Visit/migrations.ts': covered.replace('from: 1', 'from: 2'),
      'forms/Visit/fixtures/v1.json': {
        extension: { demo: { regimen: 'FIRST_LINE' } },
      },
      'forms/Visit/fixtures/v2.json': v1Document,
    });
    const declaration = declare({
      versions: [
        { file: 'v1.json' },
        { file: 'v2.json' },
        { file: 'v3.json', source: 'type.ts', type: 'Visit' },
      ],
    });
    expect(await checkFormVersions(dir, declaration)).toEqual([
      `${visit(dir, 'fixtures/v1.json')}: v1 → v2 has no migration step, so ` +
        'the document must validate unchanged against v2, and it does not: ' +
        'extension.demo.weightKg (required) — add a step from v1 to ' +
        visit(dir, 'migrations.ts'),
    ]);
  });

  it('names a last hop with no step that is not additive', async () => {
    const v2Required = {
      ...v1,
      properties: {
        ...v1.properties,
        extension: {
          type: 'object',
          properties: {
            demo: {
              ...v1.properties.extension.properties.demo,
              required: ['weightKg'],
            },
          },
        },
      },
    };
    const dir = fixture({
      'forms/Visit/v1.json': v1,
      'forms/Visit/v2.json': v2Required,
      'forms/Visit/fixtures/v1.json': {
        extension: { demo: { regimen: 'FIRST_LINE' } },
      },
    });
    const declaration = declare({
      versions: [
        { file: 'v1.json' },
        { file: 'v2.json', source: 'type.ts', type: 'Visit' },
      ],
    });
    expect(await checkFormVersions(dir, declaration)).toEqual([
      `${visit(dir, 'fixtures/v1.json')}: v1 → v2 has no migration step, so ` +
        'the document must validate unchanged against v2 (v2.json), and it ' +
        'does not: extension.demo.weightKg (required) — the change is not ' +
        `additive, so add a step from v1 to ${visit(dir, 'migrations.ts')}`,
    ]);
  });

  it('refuses a step outside the versions, before walking the chain', async () => {
    const dir = fixture({
      'forms/Visit/v1.json': v1,
      'forms/Visit/v2.json': v2,
      'forms/Visit/migrations.ts': 'export const migrations = [{ from: 2 }];',
      'forms/Visit/fixtures/v1.json': v1Document,
    });
    expect(await checkFormVersions(dir, declare())).toEqual([
      `${visit(dir, 'migrations.ts')}: migrations[0]: "from" 2 and "to" 3 ` +
        'must be version numbers with 1 ≤ from < to ≤ 2 ("to" defaults to ' +
        'from + 1)',
    ]);
  });

  it('names a migrations.ts without a migrations export', async () => {
    const dir = fixture({
      'forms/Visit/v1.json': v1,
      'forms/Visit/v2.json': v2,
      'forms/Visit/migrations.ts': 'export const steps = [];',
      'forms/Visit/fixtures/v1.json': v1Document,
    });
    expect(await checkFormVersions(dir, declare())).toEqual([
      expect.stringMatching(/migrations\.ts: must export `migrations`/),
    ]);
  });
});
