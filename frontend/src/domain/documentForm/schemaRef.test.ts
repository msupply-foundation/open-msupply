import { describe, expect, it } from 'vitest';
import { checkCoverage, flattenSchema } from './schemaDiff';
import { fieldSchemaInfo } from './schemaNode';
import { refTarget, unresolvedRefs } from './schemaRef';

// As ts-json-schema-generator emits `weight: Measure<number>`: the definition
// keyed by the type as written, the reference to it percent-encoded.
const withGeneric = (value: Record<string, unknown>) => ({
  type: 'object',
  properties: {
    weight: { $ref: '#/definitions/Measure%3Cnumber%3E' },
  },
  definitions: {
    'Measure<number>': {
      type: 'object',
      properties: { value, unit: { type: 'string', enum: ['kg', 'lb'] } },
      required: ['value'],
    },
  },
});

describe('refTarget', () => {
  it('decodes a percent-encoded segment', () => {
    const schema = withGeneric({ type: 'number' });
    expect(refTarget(schema, '#/definitions/Measure%3Cnumber%3E')).toBe(
      schema.definitions['Measure<number>']
    );
  });

  it('unescapes ~1 and ~0 after decoding', () => {
    const schema = { definitions: { 'a/b': { n: 1 }, 'c~d': { n: 2 } } };
    expect(refTarget(schema, '#/definitions/a~1b')).toEqual({ n: 1 });
    expect(refTarget(schema, '#/definitions/c~0d')).toEqual({ n: 2 });
  });

  it('names nothing for a missing key, a bad escape or another document', () => {
    const schema = { definitions: {} };
    expect(refTarget(schema, '#/definitions/Missing')).toBeUndefined();
    expect(refTarget(schema, '#/definitions/%E0%A4%A')).toBeUndefined();
    expect(refTarget(schema, 'other.json#/definitions/A')).toBeUndefined();
    expect(refTarget(schema, '#/toString')).toBeUndefined();
  });
});

describe('unresolvedRefs', () => {
  it('lists each reference that names nothing, once', () => {
    const schema = {
      properties: {
        a: { $ref: '#/definitions/Missing' },
        b: { $ref: '#/definitions/Missing' },
        c: { $ref: '#/definitions/Measure%3Cnumber%3E' },
        d: { const: { $ref: 'not a reference' } },
      },
      definitions: { 'Measure<number>': { type: 'object' } },
    };
    expect(unresolvedRefs(schema)).toEqual(['#/definitions/Missing']);
  });
});

describe('a generic type behind an encoded reference', () => {
  it('is flattened into its fields', () => {
    const fields = flattenSchema(withGeneric({ type: 'number' }));
    expect(fields.get('weight.value')).toEqual({ types: ['number'] });
    expect(fields.get('weight.unit')?.enum).toEqual(['kg', 'lb']);
  });

  it('gives the form its required mark and enum', () => {
    const schema = withGeneric({ type: 'number' });
    expect(fieldSchemaInfo(schema, 'weight.value')?.required).toBe(true);
    expect(fieldSchemaInfo(schema, 'weight.unit')?.enum).toEqual(['kg', 'lb']);
  });

  it('has its changes found by the coverage check', () => {
    expect(
      checkCoverage(
        withGeneric({ type: 'number' }),
        withGeneric({ type: 'string' }),
        { from: 1 }
      )
    ).toEqual([
      "v1 → v2: weight.value changes type from number to string and is not covered — add it to unresolved as 'any'",
    ]);
  });
});
