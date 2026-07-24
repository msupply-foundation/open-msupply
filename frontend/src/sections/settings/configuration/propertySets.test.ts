import { describe, expect, it } from 'vitest';
import {
  addSupplyLevel,
  buildSupplyLevelInput,
  forecastingConfigured,
  forecastingProperties,
  gapsConfigured,
  gapsProperties,
  parseAllowedValues,
  SUPPLY_LEVEL_KEY,
  supplyLevelsInUse,
} from './propertySets';

// AC-CN1 — the button reads Initialise until the set exists, Re-initialise
// after: "configured" means any existing property key belongs to the set.
describe('AC-CN1 — configured checks flip Initialise to Re-initialise', () => {
  it('reports GAPS unconfigured with no properties', () => {
    expect(gapsConfigured([])).toBe(false);
  });

  it('reports GAPS configured once a GAPS-only key exists', () => {
    expect(gapsConfigured(['latitude'])).toBe(true);
  });

  it('reports forecasting configured once a forecasting key exists', () => {
    expect(forecastingConfigured(['population_served'])).toBe(true);
    expect(forecastingConfigured(['latitude'])).toBe(false);
  });

  it('does not count forecasting or supply-level keys as GAPS — the sets flip independently', () => {
    // population_served/buffer_stock/supply_interval are the forecasting
    // subset; supply_level is edited by S4 — none of them mark GAPS
    // configured (transcribed from the reference client's check).
    expect(
      gapsConfigured([
        'population_served',
        'buffer_stock',
        'supply_interval',
        SUPPLY_LEVEL_KEY,
      ])
    ).toBe(false);
  });
});

// AC-CN2 — re-initialise is the same action: the fixed input sets are
// deterministic, so a repeat sends the identical upsert (idempotence itself
// is server-enforced; C2's real-backend leg covers it).
describe('AC-CN2 — the fixed sets are deterministic', () => {
  it('produces the same GAPS set on every call', () => {
    expect(gapsProperties('en')).toEqual(gapsProperties('en'));
  });

  it('embeds the forecasting subset inside the GAPS set (same ids)', () => {
    const gapsIds = gapsProperties('en').map(p => p.id);
    for (const property of forecastingProperties('en'))
      expect(gapsIds).toContain(property.id);
  });

  it('seeds localised names for fr and falls back to en elsewhere', () => {
    const fr = gapsProperties('fr').find(p => p.key === 'facility_type');
    const en = gapsProperties('en').find(p => p.key === 'facility_type');
    expect(fr?.name).toBe("Type d'établissement");
    expect(en?.name).toBe('Facility Type');
    const ar = gapsProperties('ar').find(p => p.key === 'facility_type');
    expect(ar?.name).toBe('Facility Type');
  });
});

// AC-CN6 — in-use values and duplicate prevention.
describe('AC-CN6 — in-use supply levels and duplicate prevention', () => {
  it('collects the supply-level values recorded against stores, trimmed and deduplicated', () => {
    expect(
      supplyLevelsInUse([
        JSON.stringify({ [SUPPLY_LEVEL_KEY]: 'Primary ' }),
        JSON.stringify({ [SUPPLY_LEVEL_KEY]: 'Primary' }),
        JSON.stringify({ [SUPPLY_LEVEL_KEY]: 'Service Point' }),
        JSON.stringify({ other_property: 'x' }),
        '{}',
      ])
    ).toEqual(['Primary', 'Service Point']);
  });

  it('ignores malformed or non-string property blobs', () => {
    expect(
      supplyLevelsInUse(['not json', '42', JSON.stringify({ supply_level: 7 })])
    ).toEqual([]);
  });

  it('rejects adding a value already present (duplicates prevented before saving)', () => {
    expect(addSupplyLevel(['Primary'], 'Primary')).toEqual(['Primary']);
    expect(addSupplyLevel(['Primary'], '  Primary  ')).toEqual(['Primary']);
  });

  it('rejects blank input and trims accepted values', () => {
    expect(addSupplyLevel([], '   ')).toEqual([]);
    expect(addSupplyLevel([], ' Sub-National ')).toEqual(['Sub-National']);
  });
});

// contract § Configuration — the supply-level save is a single-element array
// carrying the full new allowedValues list for that one property.
describe('supply-level save input (contract § Configuration)', () => {
  it('builds one element carrying the joined allowed values', () => {
    const input = buildSupplyLevelInput(['Primary', 'Service Point'], 'en');
    expect(input).toHaveLength(1);
    expect(input[0]).toMatchObject({
      key: SUPPLY_LEVEL_KEY,
      propertyId: SUPPLY_LEVEL_KEY,
      valueType: 'STRING',
      allowedValues: 'Primary,Service Point',
      remoteEditable: false,
    });
  });

  it('round-trips through the wire format parser', () => {
    const input = buildSupplyLevelInput(['A', 'B'], 'en');
    expect(parseAllowedValues(input[0]?.allowedValues)).toEqual(['A', 'B']);
  });
});
