/* eslint-disable camelcase -- The specification's property KEYS are the
   server's own, and snake_case: `climate_zone`, `initial_mapping_date`. They
   are data, not identifiers this app chooses, so the fixtures below spell them
   exactly as the catalogue serves them. */
import { describe, expect, it } from 'vitest';
import {
  MAPPING_DATE_KEYS,
  allowedValues,
  applicableProperties,
  propertyRows,
  type PropertyDefinition,
} from './assetProperties';

const definition = (
  key: string,
  over: Partial<PropertyDefinition> = {}
): PropertyDefinition =>
  ({
    id: `${key}-1`,
    key,
    name: key,
    valueType: 'STRING',
    allowedValues: null,
    assetClassId: null,
    assetCategoryId: null,
    assetTypeId: null,
    ...over,
  }) as PropertyDefinition;

describe('OMS-REG-CCE-06.14 — each applicable property appears once', () => {
  it('de-duplicates the same key returned under several scopes', () => {
    // The read returns ONE ROW PER SCOPE (contract ⚠️ wire trap).
    const rows = applicableProperties([
      definition('climate_zone', { id: 'a' }),
      definition('climate_zone', { id: 'b' }),
      definition('energy_source'),
    ]);
    expect(rows.map(row => row.key)).toEqual(['climate_zone', 'energy_source']);
  });

  it('keeps the first definition of a repeated key', () => {
    const rows = applicableProperties([
      definition('climate_zone', { id: 'first' }),
      definition('climate_zone', { id: 'second' }),
    ]);
    expect(rows[0]?.id).toBe('first');
  });
});

describe('OMS-REG-CCE-06.11 / .13 — the catalogue’s value wins and is read-only', () => {
  const definitions = [definition('climate_zone'), definition('site_notes')];

  it('shows the catalogue’s value where the catalogue answers the key', () => {
    const rows = propertyRows(
      definitions,
      { climate_zone: 'Cold' },
      { climate_zone: 'Hot' }
    );
    const row = rows.find(r => r.definition.key === 'climate_zone');
    expect(row?.value).toBe('Hot');
    expect(row?.fromCatalogue).toBe(true);
    expect(row?.editable).toBe(false);
  });

  it('keeps the asset’s own value where the catalogue does not answer', () => {
    const rows = propertyRows(definitions, { site_notes: 'by the door' }, {});
    const row = rows.find(r => r.definition.key === 'site_notes');
    expect(row?.value).toBe('by the door');
    expect(row?.editable).toBe(true);
  });

  it('treats a catalogue key answered with null as the catalogue’s', () => {
    // hasOwnProperty, not truthiness: a catalogue that records "no value" for a
    // key still owns it, and the store must not overwrite it.
    const rows = propertyRows(definitions, { climate_zone: 'Cold' }, {
      climate_zone: null,
    });
    const row = rows.find(r => r.definition.key === 'climate_zone');
    expect(row?.value).toBeNull();
    expect(row?.editable).toBe(false);
  });
});

describe('OMS-REG-CCE-06.12 — an unanswered property is the store’s to fill in', () => {
  it('offers an empty editable row where neither side answers', () => {
    const rows = propertyRows([definition('site_notes')], {}, {});
    expect(rows[0]?.value).toBeNull();
    expect(rows[0]?.editable).toBe(true);
  });
});

describe('OMS-REG-CCE-06.16 — the mapping dates are never typed in', () => {
  it('names both derived keys', () => {
    expect([...MAPPING_DATE_KEYS]).toEqual([
      'initial_mapping_date',
      'most_recent_mapping_date',
    ]);
  });

  it('marks each read-only even though the asset holds its value', () => {
    const rows = propertyRows(
      [definition('initial_mapping_date'), definition('most_recent_mapping_date')],
      {
        initial_mapping_date: '2023-05-06',
        most_recent_mapping_date: '2026-09-08',
      },
      {}
    );
    expect(rows.every(row => row.derived)).toBe(true);
    expect(rows.every(row => row.editable)).toBe(false);
    expect(rows[0]?.value).toBe('2023-05-06');
  });
});

describe('OMS-REG-CCE-06.15 — an asset with no specification', () => {
  it('produces no rows when nothing applies', () => {
    expect(propertyRows([], {}, {})).toEqual([]);
  });
});

describe('a choice property’s allowed values', () => {
  it('splits the comma-separated list and trims it', () => {
    expect(
      allowedValues(definition('zone', { allowedValues: 'Hot, Temperate,Cold' }))
    ).toEqual(['Hot', 'Temperate', 'Cold']);
  });

  it('reads a property declaring none as plain text', () => {
    expect(allowedValues(definition('zone'))).toBeUndefined();
    expect(allowedValues(definition('zone', { allowedValues: '  ' }))).toBeUndefined();
    expect(allowedValues(definition('zone', { allowedValues: ',,' }))).toBeUndefined();
  });
});
