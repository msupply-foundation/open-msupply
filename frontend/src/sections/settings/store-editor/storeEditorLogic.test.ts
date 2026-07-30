import { describe, expect, it } from 'vitest';
import {
  allowedValues,
  canEditAnything,
  coordinate,
  formatCoordinate,
  formatDms,
  geolocationErrorKey,
  hasCoordinates,
  haversineKm,
  isDefinitionEditable,
  parseProperties,
  propertyFields,
  roundCoordinate,
  serialiseProperties,
  setProperty,
  type PropertyDefinition,
} from './storeEditorLogic';

// The wire's own property keys, snake_case as the server serves them — held as
// constants and used as computed keys, the same way propertySets.test.ts holds
// SUPPLY_LEVEL_KEY.
const ELECTRICITY = 'electricity_availability';
const POPULATION = 'population_served';
const FACILITY_TYPE = 'facility_type';
const UNKNOWN = 'unknown_key';

const definition = (
  key: string,
  name: string,
  overrides: Partial<PropertyDefinition['property']> & {
    remoteEditable?: boolean;
  } = {}
): PropertyDefinition => {
  const { remoteEditable = false, ...property } = overrides;
  return {
    id: `def-${key}`,
    remoteEditable,
    property: {
      id: key,
      key,
      name,
      allowedValues: null,
      valueType: 'STRING',
      ...property,
    },
  };
};

describe('storeEditorLogic — store editor (spec/settings S5)', () => {
  // OMS-REG-SET-05.28 — the panel renders one field per definition, ordered by
  // definition name, with the lat/long pair excluded (the GPS block owns it).
  it('lists every definition but the GPS pair, ordered by name (SET-05.28)', () => {
    const definitions = [
      definition('zero_dose', 'Zero Dose Coverage'),
      definition('latitude', 'Latitude', { valueType: 'FLOAT' }),
      definition(FACILITY_TYPE, 'Facility Type'),
      definition('longitude', 'Longitude', { valueType: 'FLOAT' }),
      definition(ELECTRICITY, 'Electricity Availability'),
    ];
    expect(propertyFields(definitions).map(d => d.property.name)).toEqual([
      'Electricity Availability',
      'Facility Type',
      'Zero Dose Coverage',
    ]);
  });

  // OMS-REG-SET-05.28 — a single-select offers exactly the definition's
  // allowed values, split from the one comma-separated string.
  it('splits allowed values, trimming and dropping blanks (SET-05.28)', () => {
    expect(allowedValues('Government,NGO,Private,Faith-based')).toEqual([
      'Government',
      'NGO',
      'Private',
      'Faith-based',
    ]);
    expect(allowedValues('> 16 hours, 8-16 hours ,, < 8 hours')).toEqual([
      '> 16 hours',
      '8-16 hours',
      '< 8 hours',
    ]);
    expect(allowedValues(null)).toEqual([]);
    expect(allowedValues('')).toEqual([]);
  });

  // OMS-REG-SET-05.28 — the saved values pre-fill the fields. The server
  // fabricates "{}" when nothing was ever recorded, and never validates what it
  // stores, so a non-JSON / non-object blob reads as "nothing recorded".
  it('parses the stored document, tolerating the unstored cases (SET-05.28)', () => {
    expect(
      parseProperties(
        '{"electricity_availability":"> 16 hours","population_served":1200}'
      )
    ).toEqual({ [ELECTRICITY]: '> 16 hours', [POPULATION]: 1200 });
    expect(parseProperties('{}')).toEqual({});
    expect(parseProperties(null)).toEqual({});
    expect(parseProperties('not-json')).toEqual({});
    expect(parseProperties('[1,2]')).toEqual({});
  });

  // rules § The store editor — a save replaces the facility's WHOLE recorded
  // set, so an edit must round-trip every key that was read, including keys no
  // definition covers.
  it('an edit keeps every other key in the document (SET-05.28)', () => {
    const draft = parseProperties(
      '{"electricity_availability":"> 16 hours","population_served":1200,"unknown_key":"kept"}'
    );
    const edited = setProperty(draft, POPULATION, 1500);
    expect(JSON.parse(serialiseProperties(edited))).toEqual({
      [ELECTRICITY]: '> 16 hours',
      [POPULATION]: 1500,
      [UNKNOWN]: 'kept',
    });
    // The original draft is untouched — Cancel discards by dropping the copy.
    expect(draft[POPULATION]).toBe(1200);
  });

  it('clearing a field records null rather than dropping the key (SET-05.28)', () => {
    expect(
      setProperty({ [FACILITY_TYPE]: 'NGO' }, FACILITY_TYPE, undefined)
    ).toEqual({
      [FACILITY_TYPE]: null,
    });
  });

  // OMS-REG-SET-05.29 — without the store-properties permission every field is
  // read-only; away from the central server a definition not marked
  // remote-editable is read-only too.
  it('editability needs the permission, and remote-editable off central (SET-05.29)', () => {
    const remote = definition('packaging_level', 'Packaging Level', {
      remoteEditable: true,
    });
    const local = definition(FACILITY_TYPE, 'Facility Type');

    // No permission: nothing is editable, wherever we are.
    expect(
      isDefinitionEditable(remote, { canMutate: false, isCentralServer: true })
    ).toBe(false);
    // Central server: remoteEditable is not consulted.
    expect(
      isDefinitionEditable(local, { canMutate: true, isCentralServer: true })
    ).toBe(true);
    // Remote site: only the remote-editable definition.
    expect(
      isDefinitionEditable(local, { canMutate: true, isCentralServer: false })
    ).toBe(false);
    expect(
      isDefinitionEditable(remote, { canMutate: true, isCentralServer: false })
    ).toBe(true);
  });

  // OMS-REG-SET-05.29 / .30 — Save is disabled while the session can edit
  // nothing (D79), including when the server holds no definitions at all.
  it('Save is enabled only when something is editable (SET-05.29/.30)', () => {
    const definitions = [
      definition('latitude', 'Latitude', { valueType: 'FLOAT' }),
      definition(FACILITY_TYPE, 'Facility Type'),
    ];
    expect(
      canEditAnything(definitions, { canMutate: true, isCentralServer: true })
    ).toBe(true);
    expect(
      canEditAnything(definitions, { canMutate: false, isCentralServer: true })
    ).toBe(false);
    // Remote site, nothing marked remote-editable → nothing to save.
    expect(
      canEditAnything(definitions, { canMutate: true, isCentralServer: false })
    ).toBe(false);
    // No definitions at all (the empty Properties tab).
    expect(
      canEditAnything([], { canMutate: true, isCentralServer: true })
    ).toBe(false);
  });

  // OMS-REG-SET-05.32 — the GPS block reads its pair out of the same draft the
  // property fields edit; 0,0 is indistinguishable from "never recorded".
  it('reads coordinates out of the draft, defaulting to 0 (SET-05.32)', () => {
    expect(coordinate({ latitude: -41.28 }, 'latitude')).toBe(-41.28);
    // The column is an opaque pass-through: a numeric string still reads.
    expect(coordinate({ longitude: '174.777' }, 'longitude')).toBe(174.777);
    expect(coordinate({}, 'latitude')).toBe(0);
    expect(coordinate({ latitude: 'nowhere' }, 'latitude')).toBe(0);
    expect(hasCoordinates(0, 0)).toBe(false);
    expect(hasCoordinates(-41.28, 0)).toBe(true);
  });

  // OMS-REG-SET-05.32 — Update live location rounds the device's position
  // before staging it into the draft.
  it('a captured position is rounded to six decimal places (SET-05.32)', () => {
    expect(roundCoordinate(-41.28664412345678)).toBe(-41.286644);
    expect(roundCoordinate(174.7)).toBe(174.7);
  });

  it('renders the decimal value beside its degrees-minutes-seconds form', () => {
    expect(formatDms(-41.2865, 'latitude')).toBe('S 41° 17\' 11.400"');
    expect(formatDms(174.7762, 'longitude')).toBe('E 174° 46\' 34.320"');
    expect(formatDms(0, 'latitude')).toBe('N 0° 0\' 0.000"');
    expect(formatCoordinate(0, 'longitude')).toBe('0 / E 0° 0\' 0.000"');
  });

  it('measures the distance from the device to the recorded coordinates', () => {
    // Wellington → Auckland, ~493 km great-circle.
    const distance = haversineKm(
      { latitude: -41.2865, longitude: 174.7762 },
      { latitude: -36.8485, longitude: 174.7633 }
    );
    expect(distance).toBeGreaterThan(490);
    expect(distance).toBeLessThan(497);
    expect(
      haversineKm(
        { latitude: -41.2865, longitude: 174.7762 },
        { latitude: -41.2865, longitude: 174.7762 }
      )
    ).toBe(0);
  });

  it('names each geolocation failure by its browser error code', () => {
    expect(geolocationErrorKey(1)).toBe('error.permission-denied');
    expect(geolocationErrorKey(2)).toBe('error.position-unavailable');
    expect(geolocationErrorKey(3)).toBe('error.timeout');
    expect(geolocationErrorKey(99)).toBe('error.unknown-geolocation-error');
  });
});
