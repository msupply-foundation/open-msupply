import { createRoot } from 'solid-js';
import { describe, expect, it } from 'vitest';
import encounterV2 from '../../../plugins/examples/demo_program/forms/DemoEncounter/v2.json';
import enrolmentV1 from '../../../plugins/examples/demo_program/forms/DemoProgramEnrolment/v1.json';
import type { Encounter } from '../../plugin-sdk/documents';
import { createDraft, pathLabel } from './draft';
import type { SelectInputProps } from './fields';
import { withFirstNoteText } from './notes';
import {
  deepEqual,
  getAt,
  normalise,
  pointerToPath,
  setAt,
  type EnumPath,
  type NumberPath,
  type Path,
  type TextPath,
} from './paths';
import { fieldSchemaInfo, type JsonSchema } from './schemaNode';
import { validateDocument } from './validation';

// The demo plugin's DemoEncounter, restated over the SDK's base type: the
// plugin's own file imports the SDK by its bare specifier, which only the
// plugin tsconfig resolves. v2.json is emitted from that same shape.
interface DemoEncounter extends Encounter {
  extension?: {
    demo?: {
      vitals?: { weightKg?: number; heightCm?: number };
      regimen?: 'FIRST_LINE' | 'SECOND_LINE';
      nextVisit?: string;
      notes?: string;
    };
  };
}

const encounterSchema = encounterV2 as JsonSchema;
const enrolmentSchema = enrolmentV1 as JsonSchema;

const validEncounter = {
  createdDatetime: '2026-09-25T01:00:00.000Z',
  startDatetime: '2026-09-25T01:00:00.000Z',
  status: 'PENDING',
};

// Type-level checks: each line fails to compile if the path types regress.
// Assigning a literal to the union is the assertion.
const typeChecks = () => {
  const text: TextPath<DemoEncounter> = 'extension.demo.notes';
  const date: TextPath<DemoEncounter> = 'extension.demo.nextVisit';
  const num: NumberPath<DemoEncounter> = 'extension.demo.vitals.weightKg';
  const en: EnumPath<DemoEncounter> = 'extension.demo.regimen';
  const status: EnumPath<DemoEncounter> = 'status';
  const obj: Path<DemoEncounter> = 'extension.demo.vitals';
  const arr: Path<DemoEncounter> = 'notes';
  // @ts-expect-error: a misspelt path is not a path.
  const typo: Path<DemoEncounter> = 'extension.demo.vital.weightKg';
  // @ts-expect-error: a number is not free text.
  const wrongKind: TextPath<DemoEncounter> = 'extension.demo.vitals.weightKg';
  // @ts-expect-error: an enum is not free text either.
  const enumAsText: TextPath<DemoEncounter> = 'extension.demo.regimen';
  // @ts-expect-error: paths stop at arrays.
  const intoArray: Path<DemoEncounter> = 'notes.0.text';
  type RegimenOptions = SelectInputProps<
    DemoEncounter,
    'extension.demo.regimen'
  >['options'];
  const labelled: RegimenOptions = { FIRST_LINE: 'a', SECOND_LINE: 'b' };
  // @ts-expect-error: every value the enum allows needs a label.
  const unlabelled: RegimenOptions = { FIRST_LINE: 'a' };
  return [
    text,
    date,
    num,
    en,
    status,
    obj,
    arr,
    typo,
    wrongKind,
    enumAsText,
    intoArray,
    labelled,
    unlabelled,
  ];
};

describe('paths', () => {
  it('type checks hold', () => {
    expect(typeChecks()).toHaveLength(13);
  });

  it('reads through missing parents as undefined', () => {
    expect(getAt({ a: { b: 1 } }, 'a.b')).toBe(1);
    expect(getAt({ a: {} }, 'a.b.c')).toBeUndefined();
    expect(getAt(undefined, 'a')).toBeUndefined();
  });

  it('creates parents on write and prunes them when cleared', () => {
    const doc: Record<string, unknown> = { keep: 1 };
    setAt(doc, 'extension.demo.vitals.weightKg', 70);
    expect(doc).toEqual({
      keep: 1,
      extension: { demo: { vitals: { weightKg: 70 } } },
    });
    setAt(doc, 'extension.demo.vitals.weightKg', undefined);
    expect(doc).toEqual({ keep: 1 });
  });

  it('keeps a parent that still has other properties', () => {
    const doc: Record<string, unknown> = {
      extension: { demo: { regimen: 'FIRST_LINE', notes: 'x' } },
    };
    setAt(doc, 'extension.demo.notes', undefined);
    expect(doc).toEqual({ extension: { demo: { regimen: 'FIRST_LINE' } } });
  });

  it('clearing a path that does not exist changes nothing', () => {
    const doc: Record<string, unknown> = { a: 1 };
    setAt(doc, 'b.c', undefined);
    expect(doc).toEqual({ a: 1 });
  });

  it('converts AJV pointers, unescaping', () => {
    expect(pointerToPath('/extension/demo/notes')).toBe('extension.demo.notes');
    expect(pointerToPath('')).toBe('');
    expect(pointerToPath('/a~1b/c~0d')).toBe('a/b.c~d');
  });

  it('treats what an untouched optional field leaves behind as equal', () => {
    expect(
      deepEqual(
        normalise({ a: 1, b: '', c: { d: undefined }, e: [] }),
        normalise({ a: 1, e: [] })
      )
    ).toBe(true);
    expect(deepEqual(normalise({ a: 1 }), normalise({ a: 2 }))).toBe(false);
  });
});

describe('fieldSchemaInfo', () => {
  it('reads required, format and enum through $ref and allOf', () => {
    expect(fieldSchemaInfo(encounterSchema, 'startDatetime')).toEqual({
      required: true,
      format: 'date-time',
      enum: undefined,
    });
    expect(fieldSchemaInfo(encounterSchema, 'endDatetime')?.required).toBe(
      false
    );
    expect(fieldSchemaInfo(encounterSchema, 'status')?.enum).toEqual([
      'PENDING',
      'VISITED',
      'CANCELLED',
      'DELETED',
    ]);
    expect(
      fieldSchemaInfo(encounterSchema, 'extension.demo.regimen')?.enum
    ).toEqual(['FIRST_LINE', 'SECOND_LINE']);
    expect(
      fieldSchemaInfo(encounterSchema, 'extension.demo.nextVisit')?.format
    ).toBe('date-time');
  });

  it('is undefined for a path the schema does not have', () => {
    expect(fieldSchemaInfo(encounterSchema, 'extension.other')).toBeUndefined();
  });
});

describe('validateDocument', () => {
  it('passes a valid document', () => {
    expect(validateDocument('enc-v2', encounterSchema, validEncounter)).toEqual(
      []
    );
  });

  it('names a missing required property by its own path', () => {
    const errors = validateDocument('enc-v2', encounterSchema, {
      createdDatetime: validEncounter.createdDatetime,
    });
    expect(errors).toEqual([
      expect.objectContaining({ path: 'startDatetime', keyword: 'required' }),
    ]);
  });

  it('names a bad value by its path, once, with a message', () => {
    const errors = validateDocument('enc-v2', encounterSchema, {
      ...validEncounter,
      startDatetime: '25/09/2026',
      extension: {
        demo: { regimen: 'LEGACY_TRIAL', vitals: { weightKg: 'heavy' } },
      },
    });
    const byPath = Object.fromEntries(errors.map(e => [e.path, e.keyword]));
    expect(byPath).toEqual({
      startDatetime: 'format',
      'extension.demo.regimen': 'enum',
      'extension.demo.vitals.weightKg': 'type',
    });
    for (const e of errors) expect(e.message).not.toBe('');
  });

  it('accepts a date-time with an offset and refuses one without', () => {
    const at = (startDatetime: string) =>
      validateDocument('enc-v2', encounterSchema, {
        ...validEncounter,
        startDatetime,
      });
    expect(at('2026-09-25T13:00:00+12:00')).toEqual([]);
    expect(at('2026-09-25T13:00:00')).toHaveLength(1);
  });

  it('validates a second schema alongside the first', () => {
    expect(
      validateDocument('enr-v1', enrolmentSchema, {
        enrolmentDatetime: '2026-09-25T01:00:00.000Z',
      })
    ).toEqual([]);
    expect(validateDocument('enr-v1', enrolmentSchema, {})).toHaveLength(1);
  });
});

// No catalog is loaded under vitest, so a message reads as its locale key.
describe('createDraft', () => {
  const draftFor = () =>
    createDraft<DemoEncounter>({
      schema: () => ({ id: 'enc-v2', jsonSchema: encounterSchema }),
      validate: () => validateDocument,
    });

  it('writes by path and tracks dirty against its seed', () => {
    createRoot(dispose => {
      const c = draftFor();
      c.reset({ ...validEncounter } as DemoEncounter);
      expect(c.isDirty()).toBe(false);
      c.draft.set('extension.demo.vitals.weightKg', 70);
      expect(c.draft.get('extension.demo.vitals.weightKg')).toBe(70);
      expect(c.isDirty()).toBe(true);
      c.draft.set('extension.demo.vitals.weightKg', undefined);
      expect(c.isDirty()).toBe(false);
      expect(c.snapshot()).toEqual(validEncounter);
      dispose();
    });
  });

  it('keeps a missing value quiet until armed; a bad value shows at once', () => {
    createRoot(dispose => {
      const c = draftFor();
      c.reset({ ...validEncounter } as DemoEncounter);
      c.draft.set('startDatetime', undefined);
      expect(c.validation.valid()).toBe(false);
      expect(c.draft.errorFor('startDatetime')).toBeUndefined();
      c.validation.arm();
      expect(c.draft.errorFor('startDatetime')).toBe('error.field-required');
      c.draft.set('startDatetime', 'not a date');
      expect(c.draft.errorFor('startDatetime')).toBe(
        'error.document-invalid-date-time'
      );
      dispose();
    });
  });

  it('opens an invalid document with its errors shown', () => {
    createRoot(dispose => {
      const c = draftFor();
      c.reset({
        createdDatetime: validEncounter.createdDatetime,
      } as DemoEncounter);
      expect(c.validation.armed()).toBe(true);
      expect(c.draft.errorFor('startDatetime')).toBe('error.field-required');
      dispose();
    });
  });

  it('shows an unresolved value until a current one is chosen', () => {
    createRoot(dispose => {
      const c = draftFor();
      c.reset({ ...validEncounter } as DemoEncounter, {
        'extension.demo.regimen': 'LEGACY_TRIAL',
      });
      expect(c.draft.unresolved('extension.demo.regimen')).toBe('LEGACY_TRIAL');
      expect(c.draft.errorFor('extension.demo.regimen')).toBe(
        'error.document-previously-recorded'
      );
      expect(c.validation.valid()).toBe(false);
      c.draft.set('extension.demo.regimen', 'FIRST_LINE');
      expect(c.draft.errorFor('extension.demo.regimen')).toBeUndefined();
      expect(c.validation.valid()).toBe(true);
      dispose();
    });
  });

  it('reads the required flag from the schema', () => {
    createRoot(dispose => {
      const c = draftFor();
      expect(c.draft.schemaFor('startDatetime')?.required).toBe(true);
      expect(c.draft.schemaFor('extension.demo.notes')?.required).toBe(false);
      dispose();
    });
  });
});

describe('pathLabel', () => {
  it('names a field from its last segment', () => {
    expect(pathLabel('extension.demo.vitals.weightKg')).toBe('Weight kg');
    expect(pathLabel('startDatetime')).toBe('Start datetime');
  });
});

describe('withFirstNoteText', () => {
  const author = { id: 'u1', name: 'Ada' };
  const now = '2026-09-25T01:00:00.000Z';

  it('stamps a new note with its author and time', () => {
    expect(withFirstNoteText(undefined, 'Seen', author, now)).toEqual([
      { text: 'Seen', created: now, authorId: 'u1', authorName: 'Ada' },
    ]);
  });

  it('keeps an existing note author and time, and the rest of the list', () => {
    const notes = [
      { text: 'Old', created: 'then', authorId: 'u0', authorName: 'Bo' },
      { text: 'Second' },
    ];
    expect(withFirstNoteText(notes, 'New', author, now)).toEqual([
      { text: 'New', created: 'then', authorId: 'u0', authorName: 'Bo' },
      { text: 'Second' },
    ]);
  });

  it('drops an emptied note', () => {
    expect(withFirstNoteText([{ text: 'x' }], '', author, now)).toBeUndefined();
    expect(
      withFirstNoteText([{ text: 'x' }, { text: 'y' }], '', author, now)
    ).toEqual([{ text: 'y' }]);
  });
});
