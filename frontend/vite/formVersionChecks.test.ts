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

  it('names a legacy UI schema that is missing or not an object', async () => {
    const declaration = declare({
      versions: [{ file: 'v1.json', source: 'type.ts', type: 'Visit' }],
      legacyUiSchema: 'legacy-ui.json',
    });
    const missing = fixture({ 'forms/Visit/v1.json': v1 });
    expect(await checkFormVersions(missing, declaration)).toEqual([
      `${visit(missing, 'legacy-ui.json')}: legacy UI schema file not found`,
    ]);
    const list = fixture({
      'forms/Visit/v1.json': v1,
      'forms/Visit/legacy-ui.json': [],
    });
    expect(await checkFormVersions(list, declaration)).toEqual([
      `${visit(list, 'legacy-ui.json')}: a legacy UI schema must be a JSON object`,
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
      // A fixture of the current version stands in for none of v1's.
      'forms/Visit/fixtures/v2.json': { extension: { demo: {} } },
    });
    expect(await checkFormVersions(dir, declare())).toEqual([
      expect.stringMatching(
        new RegExp(
          `^${visit(dir, 'fixtures')}: no fixture of v1 — every earlier ` +
            'version needs at least one'
        )
      ),
    ]);
  });

  it('checks every fixture of a version, naming each by its own file', async () => {
    const dir = fixture({
      'forms/Visit/v1.json': v1,
      'forms/Visit/v2.json': v2,
      'forms/Visit/migrations.ts': covered,
      'forms/Visit/fixtures/v1.json': v1Document,
      'forms/Visit/fixtures/v1.first-line.json': {
        extension: { demo: { regimen: 'FIRST_LINE' } },
      },
      'forms/Visit/fixtures/v1.text-weight.json': {
        extension: { demo: { weightKg: 'heavy' } },
      },
    });
    expect(await checkFormVersions(dir, declare())).toEqual([
      expect.stringMatching(
        new RegExp(
          `^${visit(dir, 'fixtures/v1.text-weight.json')}: does not ` +
            'validate against v1 \\(v1\\.json\\): extension\\.demo\\.weightKg ' +
            '\\(type\\)'
        )
      ),
    ]);
  });

  it('passes an earlier version whose fixtures are all named cases', async () => {
    const dir = fixture({
      'forms/Visit/v1.json': v1,
      'forms/Visit/v2.json': v2,
      'forms/Visit/migrations.ts': covered,
      'forms/Visit/fixtures/v1.legacy-trial.json': v1Document,
    });
    expect(await checkFormVersions(dir, declare())).toEqual([]);
  });

  it('names a file in fixtures/ the build would not read as a fixture', async () => {
    const dir = fixture({
      'forms/Visit/v1.json': v1,
      'forms/Visit/v2.json': v2,
      'forms/Visit/migrations.ts': covered,
      'forms/Visit/fixtures/v1.json': v1Document,
      'forms/Visit/fixtures/visit-1.json': v1Document,
      'forms/Visit/fixtures/v3.json': v1Document,
      'forms/Visit/fixtures/.DS_Store': '',
    });
    expect(await checkFormVersions(dir, declare())).toEqual([
      `${visit(dir, 'fixtures/v3.json')}: a fixture of v3, which Visit does ` +
        'not have (v1 to v2) — name it after the version that recorded it',
      `${visit(dir, 'fixtures/visit-1.json')}: not a fixture name, so the ` +
        'build would never read it — name it v<n>.json or v<n>.<case>.json, ' +
        'after the version that recorded it',
    ]);
  });

  it('checks a fixture of the current version as it is, in a type with one version', async () => {
    const dir = fixture({
      'forms/Visit/v1.json': v2,
      'forms/Visit/fixtures/v1.json': { extension: { demo: { vitals: {} } } },
      'forms/Visit/fixtures/v1.text-weight.json': {
        extension: { demo: { vitals: { weightKg: 'heavy' } } },
      },
    });
    const declaration = declare({
      versions: [{ file: 'v1.json', source: 'type.ts', type: 'Visit' }],
    });
    expect(await checkFormVersions(dir, declaration)).toEqual([
      `${visit(dir, 'fixtures/v1.text-weight.json')}: does not validate ` +
        'against v1 (v1.json): extension.demo.vitals.weightKg (type) — a ' +
        'fixture is a document as v1 recorded it',
    ]);
  });

  it("names a fixture of the current version that fails its category's base schema", async () => {
    const dir = fixture({
      'forms/Visit/v1.json': v2,
      'forms/Visit/fixtures/v1.json': { extension: { demo: {} } },
    });
    const declaration = declare({
      category: 'Encounter',
      versions: [{ file: 'v1.json', source: 'type.ts', type: 'Visit' }],
    });
    expect(await checkFormVersions(dir, declaration)).toEqual([
      expect.stringMatching(
        /fixtures\/v1\.json: does not validate against the Encounter base schema, which the host checks every draft against as well: .*createdDatetime \(required\).* — fix the fixture, or the type if v1 lets through a document the base schema refuses$/
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
        'or unresolved, or, where the value records what happened (a fact ' +
        "about that visit), keep it in the new version's enum and list it in " +
        "its SelectInput's retired"
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

  it('keeps a type the old client draws to additive changes of its own', async () => {
    const legacy = (versions?: Record<string, unknown>[]) =>
      declare({
        legacyUiSchema: 'legacy-ui.json',
        ...(versions ? { versions } : {}),
      });
    const files = {
      'forms/Visit/v1.json': v1,
      'forms/Visit/v2.json': v2,
      'forms/Visit/fixtures/v1.json': v1Document,
      'forms/Visit/legacy-ui.json': { type: 'VerticalLayout', elements: [] },
    };
    const additive =
      'the old client still draws Visit (legacyUiSchema) and cannot run a ' +
      'migration, so make the change additive (a new optional field or ' +
      'value), or remove legacyUiSchema once no site runs the old client';

    // A step into the plugin's own v2 is refused, however complete.
    const stepped = fixture({
      ...files,
      'forms/Visit/migrations.ts': covered,
    });
    expect(await checkFormVersions(stepped, legacy())).toEqual([
      `${visit(stepped, 'migrations.ts')}: the step from v1 migrates into ` +
        `v2, a version the plugin adds — ${additive}, and remove the step`,
    ]);

    // With no step, the build says to make it additive, not to add one.
    const unstepped = fixture(files);
    const problems = await checkFormVersions(unstepped, legacy());
    expect(problems.length).toBeGreaterThan(0);
    for (const problem of problems) {
      expect(problem).toContain(additive);
      expect(problem).not.toMatch(
        /add a step|add one|add it to|needs this file/
      );
    }

    // Between two of the deployment's own versions, the step is required.
    const deployed = legacy([
      { file: 'v1.json', id: 'deployed-v1' },
      { file: 'v2.json', source: 'type.ts', type: 'Visit', id: 'deployed-v2' },
    ]);
    expect(await checkFormVersions(stepped, deployed)).toEqual([]);
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
