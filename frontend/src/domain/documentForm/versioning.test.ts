import { describe, expect, it } from 'vitest';
import type { Encounter } from '../../plugin-sdk/documents';
import v1 from '../../../plugins/examples/demo_program/forms/DemoEncounter/v1.json';
import v2 from '../../../plugins/examples/demo_program/forms/DemoEncounter/v2.json';
import v1Fixture from '../../../plugins/examples/demo_program/forms/DemoEncounter/fixtures/v1.json';
import {
  applyMigrations,
  keptFields,
  type Migration,
  type MigrationStep,
} from './migration';
import { checkCoverage, flattenSchema } from './schemaDiff';

// The demo's v1 → v2 step, restated: the app tsconfig cannot resolve the
// plugin's own modules (worklog, chunk 4), only its emitted JSON.
const v1ToV2: MigrationStep = {
  from: 1,
  moved: {
    'extension.demo.weightKg': 'extension.demo.vitals.weightKg',
    'extension.demo.heightCm': 'extension.demo.vitals.heightCm',
  },
  unresolved: {
    'extension.demo.regimen': { LEGACY_TRIAL: () => 'Legacy trial' },
  },
  kept: { 'extension.demo.adherence': () => 'Adherence notes' },
};

describe('applyMigrations', () => {
  it('moves, clears unresolved values and keeps kept ones', () => {
    const result = applyMigrations(v1Fixture, 1, 2, [v1ToV2]);
    expect(result?.data.extension).toEqual({
      demo: {
        vitals: { weightKg: 68, heightCm: 172 },
        nextVisit: '2026-08-29T12:00:00.000Z',
        notes: 'Reports feeling well; some tiredness in the afternoons.',
        adherence: 'Missed two doses last month while travelling.',
      },
    });
    expect(Object.keys(result?.unresolved ?? {})).toEqual([
      'extension.demo.regimen',
    ]);
    const regimen = result?.unresolved['extension.demo.regimen'];
    expect(regimen?.value).toBe('LEGACY_TRIAL');
    expect(regimen?.label?.()).toBe('Legacy trial');
  });

  it('records a value named only in a list without a label', () => {
    const step: MigrationStep = { ...v1ToV2, unresolved: { a: ['OLD'] } };
    expect(applyMigrations({ a: 'OLD' }, 1, 2, [step])?.unresolved).toEqual({
      a: { value: 'OLD' },
    });
  });

  it('leaves the loaded data untouched', () => {
    const before = structuredClone(v1Fixture);
    applyMigrations(v1Fixture, 1, 2, [v1ToV2]);
    expect(v1Fixture).toEqual(before);
  });

  it('leaves a current value alone', () => {
    const data = { extension: { demo: { regimen: 'FIRST_LINE' } } };
    expect(applyMigrations(data, 1, 2, [v1ToV2])).toEqual({
      data,
      unresolved: {},
    });
  });

  it('maps, drops and runs the transform after the map', () => {
    const step: MigrationStep = {
      from: 1,
      mapped: { status: { DONE: 'VISITED' } },
      dropped: ['legacy'],
      transform: (data, unresolve) => {
        const bp = data.bp as string | undefined;
        if (bp === 'unreadable') unresolve('bp', bp);
      },
    };
    expect(
      applyMigrations({ status: 'DONE', legacy: 1, bp: 'unreadable' }, 1, 2, [
        step,
      ])
    ).toEqual({
      data: { status: 'VISITED' },
      unresolved: { bp: { value: 'unreadable' } },
    });
  });

  it('chains steps, carrying an unresolved value along a later move', () => {
    const steps: MigrationStep[] = [
      { from: 1, unresolved: { a: ['OLD'] } },
      { from: 2, moved: { a: 'b.a' } },
    ];
    expect(applyMigrations({ a: 'OLD' }, 1, 3, steps)).toEqual({
      data: {},
      unresolved: { 'b.a': { value: 'OLD' } },
    });
  });

  it('prefers a squashed step to the single steps it replaced', () => {
    const steps: MigrationStep[] = [
      { from: 1, moved: { a: 'b' } },
      { from: 2, moved: { b: 'c' } },
      { from: 1, to: 3, moved: { a: 'd' } },
    ];
    expect(applyMigrations({ a: 1 }, 1, 3, steps)?.data).toEqual({ d: 1 });
  });

  it('carries data unchanged across a version with no step', () => {
    expect(
      applyMigrations({ a: 1 }, 1, 3, [{ from: 2, moved: { a: 'b' } }])
    ).toEqual({ data: { b: 1 }, unresolved: {} });
  });

  it('cannot go back from a later version', () => {
    expect(applyMigrations({}, 3, 2, [v1ToV2])).toBeUndefined();
  });

  it('lists every kept path once', () => {
    expect(keptFields([v1ToV2, v1ToV2]).map(k => k.path)).toEqual([
      'extension.demo.adherence',
    ]);
  });
});

describe('flattenSchema', () => {
  it('follows $refs to every field, with types and enums', () => {
    const fields = flattenSchema(v2);
    expect(fields.get('extension.demo.vitals.weightKg')).toEqual({
      types: ['number'],
    });
    expect(fields.get('extension.demo.regimen')?.enum).toEqual([
      'FIRST_LINE',
      'SECOND_LINE',
    ]);
    expect(fields.has('clinician.firstName')).toBe(true);
    expect(fields.has('extension.demo.weightKg')).toBe(false);
  });
});

describe('checkCoverage', () => {
  it('passes the demo step', () => {
    expect(checkCoverage(v1, v2, v1ToV2)).toEqual([]);
  });

  it('names a retired value the map leaves out', () => {
    expect(checkCoverage(v1, v2, { ...v1ToV2, unresolved: {} })).toEqual([
      'v1 → v2: extension.demo.regimen value "LEGACY_TRIAL" is retired and not covered — add it to mapped or unresolved',
    ]);
  });

  it('names a removed path the map leaves out', () => {
    expect(checkCoverage(v1, v2, { ...v1ToV2, kept: {} })).toEqual([
      'v1 → v2: extension.demo.adherence is removed and not covered — add it to moved, kept or dropped',
    ]);
  });

  it('accepts a mapping in place of an unresolved mark', () => {
    const step = {
      ...v1ToV2,
      unresolved: {},
      mapped: { 'extension.demo.regimen': { LEGACY_TRIAL: 'SECOND_LINE' } },
    };
    expect(checkCoverage(v1, v2, step)).toEqual([]);
  });

  it('reads a labelled entry by its values', () => {
    const step = {
      ...v1ToV2,
      unresolved: {
        'extension.demo.regimen': {
          LEGACY_TRIAL: () => 'Legacy trial',
          FIRST_LINE: () => 'First line',
        },
      },
    };
    expect(checkCoverage(v1, v2, step)).toEqual([
      'v1 → v2: unresolved names extension.demo.regimen value "FIRST_LINE", which is not retired',
    ]);
  });

  it('refuses entries that cover nothing', () => {
    const step: MigrationStep = {
      ...v1ToV2,
      moved: {
        ...v1ToV2.moved,
        'extension.demo.weight': 'extension.demo.notes',
      },
      unresolved: { 'extension.demo.regimen': ['LEGACY_TRIAL', 'FIRST_LINE'] },
      dropped: ['extension.demo.gone'],
    };
    expect(checkCoverage(v1, v2, step)).toEqual([
      'v1 → v2: moved names extension.demo.weight, which v1 does not have',
      'v1 → v2: dropped names extension.demo.gone, which v1 does not have',
      'v1 → v2: unresolved names extension.demo.regimen value "FIRST_LINE", which is not retired',
    ]);
  });

  it('covers an object by its path, but still checks inside a move', () => {
    const bp = (inner: Record<string, unknown>) => ({
      type: 'object',
      properties: { bp: { type: 'object', properties: inner } },
    });
    const old = bp({ sys: { type: 'number' }, dia: { type: 'number' } });
    const renamed = {
      type: 'object',
      properties: {
        vitals: bp({
          systolic: { type: 'number' },
          diastolic: { type: 'number' },
        }),
      },
    };
    expect(
      checkCoverage(old, renamed, { from: 1, moved: { bp: 'vitals.bp' } })
    ).toEqual([
      'v1 → v2: bp.sys moves with its parent to vitals.bp.sys, which v2 does not have — add it to moved, kept or dropped',
      'v1 → v2: bp.dia moves with its parent to vitals.bp.dia, which v2 does not have — add it to moved, kept or dropped',
    ]);
    expect(
      checkCoverage(old, { type: 'object' }, { from: 1, dropped: ['bp'] })
    ).toEqual([]);
  });

  it('refuses a move onto a path the old version has, unless it moves away too', () => {
    const fields = {
      type: 'object',
      properties: { a: { type: 'string' }, b: { type: 'string' } },
    };
    expect(
      checkCoverage(fields, fields, { from: 1, moved: { a: 'b' } })
    ).toEqual([
      'v1 → v2: moved takes a to b, which v1 already has, so its value would be overwritten — move b as well',
    ]);
    // Dropping b is no way round it: dropped is applied after the moves.
    expect(
      checkCoverage(fields, fields, {
        from: 1,
        moved: { a: 'b' },
        dropped: ['b'],
      })
    ).toContain(
      'v1 → v2: moved takes a to b, which v1 already has, so its value would be overwritten — move b as well'
    );
    expect(
      checkCoverage(fields, fields, { from: 1, moved: { a: 'b', b: 'a' } })
    ).toEqual([]);
  });

  it('refuses two moves onto one path, or one inside the other', () => {
    const str = { type: 'string' };
    const old = {
      type: 'object',
      properties: { phone: str, mobile: str, contact: str },
    };
    const merged = {
      type: 'object',
      properties: {
        contactNumber: str,
        details: { type: 'object', properties: { phone: str } },
      },
    };
    expect(
      checkCoverage(old, merged, {
        from: 1,
        moved: { phone: 'contactNumber', mobile: 'contactNumber' },
        dropped: ['contact'],
      })
    ).toContain(
      'v1 → v2: moved takes phone to contactNumber and mobile to contactNumber, the same path, so one value would overwrite the other — give each its own path'
    );
    expect(
      checkCoverage(old, merged, {
        from: 1,
        moved: { contact: 'details', mobile: 'details.phone' },
        dropped: ['phone'],
      })
    ).toContain(
      'v1 → v2: moved takes contact to details and mobile to details.phone, one inside the other, so one value would overwrite the other — give each its own path'
    );
    // Neighbouring paths are their own places.
    expect(
      checkCoverage(old, merged, {
        from: 1,
        moved: { phone: 'contactNumber', mobile: 'details.phone' },
        dropped: ['contact'],
      })
    ).toEqual([]);
  });

  it('refuses kept on a path the new version still has', () => {
    const old = {
      type: 'object',
      properties: {
        x: {
          type: 'object',
          properties: {
            y: { type: 'string' },
            z: { type: 'string', enum: ['A', 'B'] },
          },
        },
      },
    };
    const next = {
      type: 'object',
      properties: {
        x: {
          type: 'object',
          properties: {
            y: { type: 'number' },
            z: { type: 'string', enum: ['A'] },
          },
        },
      },
    };
    expect(
      checkCoverage(old, next, { from: 1, kept: { x: () => 'X' } })
    ).toEqual([
      'v1 → v2: kept names x, which v2 still has — kept is for a removed path; cover a change at it with moved, mapped or unresolved',
    ]);
  });

  it('names a changed type, which unresolved covers as any', () => {
    const old = { type: 'object', properties: { bp: { type: 'string' } } };
    const next = {
      type: 'object',
      properties: {
        bp: { type: 'object', properties: { systolic: { type: 'number' } } },
      },
    };
    expect(checkCoverage(old, next, { from: 1 })).toEqual([
      "v1 → v2: bp changes type from string to object and is not covered — add it to unresolved as 'any'",
    ]);
    expect(
      checkCoverage(old, next, { from: 1, unresolved: { bp: 'any' } })
    ).toEqual([]);
  });
});

describe('Migration typing', () => {
  interface Doc extends Encounter {
    extension?: { demo?: { regimen?: 'A' | 'B'; vitals?: { kg?: number } } };
  }
  it('checks new paths and mapped values against the target type', () => {
    const ok: Migration<Doc> = {
      from: 1,
      moved: { anything: 'extension.demo.vitals.kg' },
      mapped: { 'extension.demo.regimen': { OLD: 'A' } },
      unresolved: {
        'extension.demo.regimen': ['X'],
        'extension.demo.vitals': 'any',
      },
    };
    const bad: Migration<Doc> = {
      from: 1,
      // @ts-expect-error — not a path of the target type
      moved: { anything: 'extension.demo.vitals.lbs' },
      // @ts-expect-error — not one of the enum's values
      mapped: { 'extension.demo.regimen': { OLD: 'C' } },
    };
    expect([ok, bad]).toHaveLength(2);
  });
});
