import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';
import {
  canonicalJson,
  emitFormSchemas,
  packFormPlugin,
  parseFormsDeclaration,
  readFormsDeclaration,
  schemaVersionId,
  toDocumentSchema,
} from './formPlugins.ts';

const demoDir = fileURLToPath(
  new URL('../plugins/examples/demo_program', import.meta.url)
);

// A throwaway plugin directory holding the given files.
const fixtures: string[] = [];
afterAll(() => {
  for (const dir of fixtures) rmSync(dir, { recursive: true, force: true });
});
const fixture = (files: Record<string, unknown>): string => {
  const dir = mkdtempSync(join(tmpdir(), 'form-plugin-'));
  fixtures.push(dir);
  for (const [path, content] of Object.entries(files)) {
    const full = join(dir, path);
    mkdirSync(join(full, '..'), { recursive: true });
    writeFileSync(
      full,
      typeof content === 'string' ? content : JSON.stringify(content)
    );
  }
  return dir;
};

const encounterEntry = {
  documentType: 'Visit',
  category: 'Encounter',
  name: 'Visit',
  programKey: 'demo',
  versions: [{ file: 'v1.json', source: 'type.ts', type: 'Visit' }],
};

describe('canonicalJson', () => {
  it('sorts keys at every depth, keeps array order, and has no whitespace', () => {
    expect(
      canonicalJson({ b: [3, { z: 1, a: 2 }], a: { d: null, c: 'x' } })
    ).toBe('{"a":{"c":"x","d":null},"b":[3,{"a":2,"z":1}]}');
  });

  it('sorts integer-like keys as strings, which JS object order does not', () => {
    expect(canonicalJson({ b: 1, 10: 1, 2: 1 })).toBe('{"10":1,"2":1,"b":1}');
  });
});

describe('schemaVersionId', () => {
  it('is <code>_<type>_v<n>_<12 hex of the canonical SHA-256>', () => {
    // sha256('{"a":1}') = 015abd7f5cc57a2dd94b7590f04ad8084273905ee33ec5cebeae62276a97f862
    expect(schemaVersionId('demo_program', 'Visit', 2, { a: 1 })).toBe(
      'demo_program_Visit_v2_015abd7f5cc5'
    );
  });

  it('depends on content, not key order', () => {
    const one = schemaVersionId('p', 'T', 1, { a: 1, b: { c: 2, d: 3 } });
    expect(schemaVersionId('p', 'T', 1, { b: { d: 3, c: 2 }, a: 1 })).toBe(one);
    expect(schemaVersionId('p', 'T', 1, { a: 1, b: { c: 2 } })).not.toBe(one);
  });
});

describe('toDocumentSchema', () => {
  it('replaces the root $ref with an object that is allOf the type', () => {
    expect(
      toDocumentSchema(
        { $ref: '#/definitions/Visit', $schema: 'x', definitions: {} },
        'Visit'
      )
    ).toEqual({
      $schema: 'x',
      definitions: {},
      type: 'object',
      allOf: [{ $ref: '#/definitions/Visit' }],
    });
  });
});

describe('parseFormsDeclaration', () => {
  it("reads the demo plugin's declaration, defaulting nothing it states", () => {
    const declaration = readFormsDeclaration(demoDir);
    expect(declaration?.programKeys).toEqual(['demo']);
    expect(
      declaration?.documentTypes.map(entry => [
        entry.documentType,
        entry.category,
        entry.programKey,
        entry.versions.length,
      ])
    ).toEqual([
      ['Patient', 'Patient', undefined, 1],
      ['DemoProgramEnrolment', 'ProgramEnrolment', 'demo', 1],
      ['DemoEncounter', 'Encounter', 'demo', 2],
    ]);
  });

  it('defaults a type directory to its document type', () => {
    const declaration = parseFormsDeclaration(
      { programKeys: ['demo'], documentTypes: [encounterEntry] },
      'forms.json'
    );
    expect(declaration.documentTypes[0].dir).toBe('Visit');
  });

  const refusals: [string, Record<string, unknown>, RegExp][] = [
    [
      'a Patient entry under another document type',
      { ...encounterEntry, category: 'Patient', programKey: undefined },
      /Patient category must have document type "Patient"/,
    ],
    [
      'a Patient entry with a program key',
      { ...encounterEntry, documentType: 'Patient', category: 'Patient' },
      /belongs to no program/,
    ],
    [
      'the Patient document type in another category',
      { ...encounterEntry, documentType: 'Patient' },
      /reserved for the Patient category/,
    ],
    [
      'a program entry with no program key',
      { ...encounterEntry, programKey: undefined },
      /needs a "programKey"/,
    ],
    [
      'a program key the plugin does not declare',
      { ...encounterEntry, programKey: 'other' },
      /"other" is not in "programKeys"/,
    ],
    [
      'an unknown category',
      { ...encounterEntry, category: 'Vaccination' },
      /"category" must be one of/,
    ],
    [
      'a current version with no type to emit it from',
      { ...encounterEntry, versions: [{ file: 'v1.json' }] },
      /last version is the current one/,
    ],
    [
      'a path leaving the type directory',
      { ...encounterEntry, events: '../../secrets.json' },
      /must stay inside/,
    ],
    [
      'a misspelt key',
      { ...encounterEntry, programkey: 'demo' },
      /unknown key "programkey"/,
    ],
  ];
  it.each(refusals)('refuses %s', (_, entry, message) => {
    expect(() =>
      parseFormsDeclaration(
        { programKeys: ['demo'], documentTypes: [entry] },
        'forms.json'
      )
    ).toThrow(message);
  });

  it('refuses a document type declared twice', () => {
    expect(() =>
      parseFormsDeclaration(
        {
          programKeys: ['demo'],
          documentTypes: [encounterEntry, { ...encounterEntry, dir: 'Other' }],
        },
        'forms.json'
      )
    ).toThrow(/document type "Visit" is declared twice/);
  });

  it('names every problem at once', () => {
    expect(() =>
      parseFormsDeclaration(
        {
          programKeys: ['demo'],
          documentTypes: [
            { ...encounterEntry, programKey: undefined },
            { ...encounterEntry, documentType: 'Other', category: 'Nope' },
          ],
        },
        'forms.json'
      )
    ).toThrow(/needs a "programKey"[\s\S]*"category" must be one of/);
  });
});

describe('packFormPlugin', () => {
  const schema = { $schema: 'x', type: 'object' };
  const rules = [
    {
      type: 'Field',
      conditions: [{ field: 'extension.demo.x', isSet: true }],
      event: { type: 'x', dataField: 'extension.demo.x' },
    },
  ];
  const declaration = parseFormsDeclaration(
    {
      programKeys: ['demo'],
      documentTypes: [
        {
          documentType: 'Patient',
          category: 'Patient',
          name: 'Patient',
          versions: [{ file: 'v1.json', source: 'type.ts', type: 'P' }],
        },
        {
          ...encounterEntry,
          versions: [
            { file: 'v1.json' },
            { file: 'v2.json', source: 'type.ts', type: 'Visit' },
          ],
          events: 'events.json',
        },
      ],
    },
    'forms.json'
  );

  it('packs versions in order, with ids, program keys and config', () => {
    const dir = fixture({
      'forms/Patient/v1.json': schema,
      'forms/Visit/v1.json': schema,
      'forms/Visit/v2.json': { ...schema, title: 'v2' },
      'forms/Visit/events.json': rules,
    });
    const row = packFormPlugin('demo_program', dir, declaration);
    expect(row.plugin_code).toBe('demo_program');
    expect(row.program_keys).toEqual(['demo']);
    const [patient, visit] = row.document_types;
    expect(patient).toMatchObject({
      document_type: 'Patient',
      program_key: null,
      config: null,
    });
    expect(visit.program_key).toBe('demo');
    expect(visit.versions.map(version => version.id)).toEqual([
      schemaVersionId('demo_program', 'Visit', 1, schema),
      schemaVersionId('demo_program', 'Visit', 2, { ...schema, title: 'v2' }),
    ]);
    expect(visit.versions[1].json_schema).toEqual({ ...schema, title: 'v2' });
    expect(visit.config).toEqual({ events: rules });
  });

  it('fails naming each missing version file', () => {
    const dir = fixture({
      'forms/Patient/v1.json': schema,
      'forms/Visit/v2.json': schema,
      'forms/Visit/events.json': rules,
    });
    expect(() => packFormPlugin('demo_program', dir, declaration)).toThrow(
      /Visit\/v1\.json: schema version file not found/
    );
  });

  it('fails on an event rule the server could not read', () => {
    const dir = fixture({
      'forms/Patient/v1.json': schema,
      'forms/Visit/v1.json': schema,
      'forms/Visit/v2.json': schema,
      'forms/Visit/events.json': [{ type: 'Fields', event: {} }],
    });
    expect(() => packFormPlugin('demo_program', dir, declaration)).toThrow(
      /events\.json \[0\]: an event rule/
    );
  });
});

describe('emitFormSchemas', () => {
  const visitType = (field: string) => `
    import type { Encounter } from '@openmsupply/plugin-sdk';
    export interface Visit extends Encounter {
      extension?: {
        demo?: {
          /**
           * When
           *
           * @format date
           */
          ${field}?: string;
        };
      };
    }
  `;
  const setup = () => {
    const dir = fixture({
      'forms/Visit/type.ts': visitType('nextVisit'),
      'forms/Visit/v1.ts': visitType('nextVisitV1').replace(
        'interface Visit ',
        'interface VisitV1 '
      ),
    });
    const declaration = parseFormsDeclaration(
      {
        programKeys: ['demo'],
        documentTypes: [
          {
            ...encounterEntry,
            versions: [
              { file: 'v1.json', source: 'v1.ts', type: 'VisitV1' },
              { file: 'v2.json', source: 'type.ts', type: 'Visit' },
            ],
          },
        ],
      },
      'forms.json'
    );
    const file = (name: string) => join(dir, 'forms/Visit', name);
    return { dir, declaration, file };
  };

  it('emits the current version and a missing earlier one, then is stable', async () => {
    const { dir, declaration, file } = setup();
    const first = await emitFormSchemas(dir, declaration, { check: false });
    expect(first.problems).toEqual([]);
    expect(first.written).toEqual([file('v1.json'), file('v2.json')]);

    const v2 = JSON.parse(readFileSync(file('v2.json'), 'utf8'));
    expect(v2.$ref).toBeUndefined();
    expect(v2.type).toBe('object');
    expect(v2.allOf).toEqual([{ $ref: '#/definitions/Visit' }]);
    // The SDK base type arrives through the plugin tsconfig's path mapping.
    expect(v2.definitions.Visit.required).toEqual([
      'createdDatetime',
      'startDatetime',
    ]);
    expect(
      v2.definitions.Visit.properties.extension.properties.demo.properties
        .nextVisit
    ).toEqual({ description: 'When', format: 'date', type: 'string' });
    expect(readFileSync(file('v2.json'), 'utf8').endsWith('}\n')).toBe(true);

    const again = await emitFormSchemas(dir, declaration, { check: true });
    expect(again.problems).toEqual([]);
    expect(again.unchanged).toEqual([file('v2.json')]);
  });

  it('never rewrites an earlier version, and check names a stale current one', async () => {
    const { dir, declaration, file } = setup();
    await emitFormSchemas(dir, declaration, { check: false });
    writeFileSync(file('v1.json'), '{"frozen":true}\n');
    writeFileSync(file('type.ts'), visitType('renamed'));

    const checked = await emitFormSchemas(dir, declaration, { check: true });
    expect(checked.problems).toEqual([
      expect.stringMatching(/v2\.json: stale — Visit in type\.ts generates/),
    ]);

    await emitFormSchemas(dir, declaration, { check: false });
    expect(readFileSync(file('v1.json'), 'utf8')).toBe('{"frozen":true}\n');
    expect(readFileSync(file('v2.json'), 'utf8')).toContain('"renamed"');
  });

  it('check reports a missing earlier version without writing it', async () => {
    const { dir, declaration, file } = setup();
    const checked = await emitFormSchemas(dir, declaration, { check: true });
    expect(checked.written).toEqual([]);
    expect(checked.problems).toEqual([
      expect.stringMatching(/v1\.json: missing — run `pnpm forms:emit`/),
      expect.stringMatching(/v2\.json: missing — it is emitted from Visit/),
    ]);
    expect(() => readFileSync(file('v1.json'))).toThrow();
  });
});
