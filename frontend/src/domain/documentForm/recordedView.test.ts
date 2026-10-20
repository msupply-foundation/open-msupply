import { describe, expect, it } from 'vitest';
import v1 from '../../../plugins/examples/demo_program/forms/DemoEncounter/v1.json';
import v1Fixture from '../../../plugins/examples/demo_program/forms/DemoEncounter/fixtures/v1.json';
import {
  holdsBeyondSchema,
  humanise,
  recordedView,
  type RecordedEntry,
} from './recordedView';

/*
 * The fallback renderer's layout (implementation-plan H12): a document no form
 * can open, laid out from the schema it is pinned to alone.
 */

// The entries as label → value or nested labels, for readable expectations.
const outline = (entries: RecordedEntry[]): unknown[] =>
  entries.map(entry =>
    entry.kind === 'group'
      ? { [entry.label]: outline(entry.entries) }
      : [entry.label, entry.value]
  );

describe('recordedView', () => {
  it("lays out a plugin's emitted schema in its order, through $ref and allOf", () => {
    const view = recordedView(v1, v1Fixture);
    expect(outline(view.entries)).toEqual([
      ['Created datetime', '2026-07-30T01:30:00.000Z'],
      {
        Extension: [
          {
            Demo: [
              ['Adherence', 'Missed two doses last month while travelling.'],
              ['Height cm', 172],
              ['Next visit', '2026-08-29T12:00:00.000Z'],
              [
                'Notes',
                'Reports feeling well; some tiredness in the afternoons.',
              ],
              ['Regimen', 'LEGACY_TRIAL'],
              ['Weight kg', 68],
            ],
          },
        ],
      },
      ['Start datetime', '2026-07-30T01:30:00.000Z'],
      ['Status', 'VISITED'],
    ]);
    expect(view.undeclared).toEqual([]);
  });

  it("carries each value's format, from the field or its $ref", () => {
    const view = recordedView(v1, v1Fixture);
    const created = view.entries[0];
    expect(created).toMatchObject({
      kind: 'value',
      path: 'createdDatetime',
      format: 'date-time',
    });
  });

  it('lists values the schema does not declare by their paths, after', () => {
    const schema = {
      type: 'object',
      properties: {
        generalExamination: {
          type: 'object',
          properties: { weight: { type: 'number' } },
        },
      },
    };
    // Djibouti's encounters keep a maternal history their schema dropped.
    const data = {
      generalExamination: { weight: 61, size: 160 },
      maternalHistory: { parity: 3, lastBirth: { alive: true } },
    };
    const view = recordedView(schema, data);
    expect(outline(view.entries)).toEqual([
      { 'General examination': [['Weight', 61]] },
    ]);
    expect(view.undeclared).toEqual([
      { path: 'generalExamination.size', value: 160 },
      { path: 'maternalHistory.parity', value: 3 },
      { path: 'maternalHistory.lastBirth.alive', value: true },
    ]);
  });

  it("shows a free-form object's values by name, not as undeclared", () => {
    const schema = {
      type: 'object',
      properties: { extension: { type: 'object' } },
    };
    const view = recordedView(schema, { extension: { ward: 'B' } });
    expect(outline(view.entries)).toEqual([{ Extension: [['Ward', 'B']] }]);
    expect(view.undeclared).toEqual([]);
  });

  it('numbers the items of a list of records, and joins a list of values', () => {
    const schema = {
      type: 'object',
      properties: {
        contactDetails: {
          type: 'array',
          items: {
            type: 'object',
            properties: { phone: { type: 'string', title: 'Phone number' } },
          },
        },
        allergies: { type: 'array', items: { type: 'string' } },
      },
    };
    const view = recordedView(schema, {
      contactDetails: [{ phone: '77 01' }, {}, { phone: '77 02' }],
      allergies: ['Penicillin', 'Latex'],
    });
    expect(outline(view.entries)).toEqual([
      {
        'Contact details': [
          { 'Contact details 1': [['Phone number', '77 01']] },
          { 'Contact details 3': [['Phone number', '77 02']] },
        ],
      },
      ['Allergies', ['Penicillin', 'Latex']],
    ]);
  });

  it('leaves out empty values and groups left with nothing', () => {
    const schema = {
      type: 'object',
      properties: {
        a: { type: 'string' },
        b: { type: 'object', properties: { c: { type: 'string' } } },
        d: { type: 'array', items: { type: 'string' } },
        e: { type: 'boolean' },
        f: { type: 'number' },
      },
    };
    const view = recordedView(schema, {
      a: '',
      b: { c: null },
      d: [],
      e: false,
      f: 0,
    });
    expect(outline(view.entries)).toEqual([
      ['E', false],
      ['F', 0],
    ]);
  });

  it("reads a nullable field's format and properties from its alternatives", () => {
    const schema = {
      type: 'object',
      properties: {
        dateOfDeath: {
          anyOf: [{ type: 'string', format: 'date' }, { type: 'null' }],
        },
        nextOfKin: {
          oneOf: [
            { type: 'object', properties: { name: { type: 'string' } } },
            { type: 'null' },
          ],
        },
      },
    };
    const view = recordedView(schema, {
      dateOfDeath: '2026-01-02',
      nextOfKin: { name: 'Hodan' },
    });
    expect(view.entries[0]).toMatchObject({ format: 'date' });
    expect(outline(view.entries)).toEqual([
      ['Date of death', '2026-01-02'],
      { 'Next of kin': [['Name', 'Hodan']] },
    ]);
    expect(view.undeclared).toEqual([]);
  });

  it("never labels a field with the title of one of an enum's members", () => {
    // An enum written as `const` members, each with its own title: a stored
    // 'F' must not read as "Male".
    const schema = {
      type: 'object',
      properties: {
        gender: {
          oneOf: [
            { const: 'M', title: 'Male' },
            { const: 'F', title: 'Female' },
          ],
        },
        referral: {
          anyOf: [
            {
              type: 'object',
              title: 'Referral details',
              properties: { by: { type: 'string' } },
            },
            { type: 'null' },
          ],
        },
        choice: {
          oneOf: [
            { type: 'string', title: 'As text' },
            { type: 'number', title: 'As number' },
          ],
        },
      },
    };
    const view = recordedView(schema, {
      gender: 'F',
      referral: { by: 'Dr A' },
      choice: 'x',
    });
    expect(outline(view.entries)).toEqual([
      ['Gender', 'F'],
      { 'Referral details': [['By', 'Dr A']] },
      ['Choice', 'x'],
    ]);
  });

  it('shows nothing for data that is not an object, and survives no schema', () => {
    expect(recordedView(v1, 'text')).toEqual({ entries: [], undeclared: [] });
    expect(outline(recordedView(undefined, { a: 1 }).entries)).toEqual([
      ['A', 1],
    ]);
  });
});

describe('humanise', () => {
  it.each([
    ['dateOfBirth', 'Date of birth'],
    ['code2', 'Code 2'],
    ['HIVStatus', 'HIV status'],
    ['isHIVPositive', 'Is HIV positive'],
    ['first_name', 'First name'],
    ['weightKg', 'Weight kg'],
  ])('%s → %s', (key, label) => {
    expect(humanise(key)).toBe(label);
  });
});

describe('holdsBeyondSchema', () => {
  const schema = {
    type: 'object',
    properties: {
      name: { type: 'string' },
      contacts: {
        type: 'array',
        items: { type: 'object', properties: { phone: { type: 'string' } } },
      },
      extension: { type: 'object' },
    },
  };

  it('is false for data the schema declares, empty values aside', () => {
    expect(
      holdsBeyondSchema(schema, {
        name: 'A',
        contacts: [{ phone: '1' }],
        extension: {},
        other: '',
      })
    ).toBe(false);
  });

  it('is true for a key the schema does not declare, at any depth', () => {
    expect(holdsBeyondSchema(schema, { name: 'A', other: 1 })).toBe(true);
    expect(
      holdsBeyondSchema(schema, { contacts: [{ phone: '1', fax: '2' }] })
    ).toBe(true);
  });

  it('is true for anything inside an object that declares no properties', () => {
    expect(holdsBeyondSchema(schema, { extension: { ward: 'B' } })).toBe(true);
  });

  it('follows $ref and allOf, as the base types are emitted', () => {
    const emitted = {
      allOf: [{ $ref: '#/definitions/Doc' }],
      definitions: {
        Doc: { type: 'object', properties: { a: { type: 'string' } } },
      },
    };
    expect(holdsBeyondSchema(emitted, { a: 'x' })).toBe(false);
    expect(holdsBeyondSchema(emitted, { a: 'x', b: 'y' })).toBe(true);
  });
});
