import { describe, expect, it } from 'vitest';
import {
  buildUpdateInput,
  formFromSensor,
  isNameEditable,
  isUnchanged,
  type SensorFormState,
  type SensorRow,
} from './sensorEdit';
import type { SensorType } from './sensorDisplay';

// Logic-level coverage of the sensor editor (spec/cold-chain-sensors § what the
// user owns / naming / assigning a location).
//
// Anchors: spec/cold-chain-sensors/cases/OMS-REG-CCE-03.

const sensor = (over: Partial<SensorRow> = {}): SensorRow => ({
  __typename: 'SensorNode',
  id: 'sensor-1',
  name: 'Berlinger 1',
  serial: 'BRL-0001',
  type: 'BERLINGER',
  isActive: true,
  batteryLevel: 85,
  location: null,
  assets: { __typename: 'AssetConnector', nodes: [] },
  latestTemperatureLog: { nodes: [] },
  breach: null,
  ...over,
});

const AT_LOCATION = { id: 'loc-1', code: 'RS-FR1', name: 'Freezer 1' };

describe('OMS-REG-CCE-03.21 / .22 — which sensors may be renamed', () => {
  it.each<[SensorType, boolean]>([
    ['BERLINGER', true],
    ['LOG_TAG', true],
    ['BLUE_MAESTRO', false],
    ['LAIRD', false],
  ])('%s name editable: %s', (type, editable) => {
    expect(isNameEditable(sensor({ type }))).toBe(editable);
  });
});

describe('OMS-REG-CCE-03.10 / .37 — the device’s own values are never written', () => {
  it('offers only name, location and active state as a draft', () => {
    expect(Object.keys(formFromSensor(sensor())).sort()).toEqual([
      'isActive',
      'locationId',
      'name',
    ]);
  });

  it('sends no battery level or logging interval on a save', () => {
    const row = sensor({ location: AT_LOCATION });
    // Everything a user can touch, changed at once — the widest input the
    // editor can possibly build.
    const input = buildUpdateInput(
      { name: 'renamed', locationId: 'loc-2', isActive: false },
      row
    );
    expect(Object.keys(input).sort()).toEqual([
      'id',
      'isActive',
      'locationId',
      'name',
    ]);
  });

  it('never carries the serial or the sensor type', () => {
    const row = sensor();
    const input = buildUpdateInput(
      { ...formFromSensor(row), name: 'renamed' },
      row
    );
    expect(input).not.toHaveProperty('serial');
    expect(input).not.toHaveProperty('type');
  });
});

describe('OMS-REG-CCE-03.52 — a save writes only what the editor changed', () => {
  it('carries nothing but the id when the draft is untouched', () => {
    const row = sensor({ location: AT_LOCATION });
    expect(buildUpdateInput(formFromSensor(row), row)).toEqual({
      id: 'sensor-1',
    });
  });

  it.each<[string, Partial<SensorFormState>, string]>([
    ['a rename', { name: 'renamed' }, 'name'],
    ['a move', { locationId: 'loc-2' }, 'locationId'],
    ['a retirement', { isActive: false }, 'isActive'],
  ])('%s carries that field and no other', (_, patch, key) => {
    const row = sensor({ location: AT_LOCATION });
    const input = buildUpdateInput({ ...formFromSensor(row), ...patch }, row);
    expect(Object.keys(input).sort()).toEqual(['id', key].sort());
  });

  it('leaves the location out of a rename, so a concurrent move survives', () => {
    // The editor loaded the sensor at loc-1; someone else moved it to loc-3
    // while the modal sat open. A rename must not put it back (the whole point
    // of the sparse patch — omitting the key means "leave it alone" on the
    // wire).
    const row = sensor({ location: AT_LOCATION });
    const input = buildUpdateInput(
      { ...formFromSensor(row), name: 'renamed' },
      row
    );
    expect(input).not.toHaveProperty('locationId');
  });
});

describe('OMS-REG-CCE-03.25 / .26 — the confirming action follows the draft', () => {
  it('is inert while the draft matches the sensor as loaded', () => {
    const row = sensor({ location: AT_LOCATION });
    expect(isUnchanged(formFromSensor(row), row)).toBe(true);
  });

  it.each([
    ['name', { name: 'renamed' }],
    ['location', { locationId: 'loc-2' }],
    ['active state', { isActive: false }],
  ])('becomes available once the %s changes', (_, patch) => {
    const row = sensor({ location: AT_LOCATION });
    const form = { ...formFromSensor(row), ...patch };
    expect(isUnchanged(form, row)).toBe(false);
  });

  it('is inert again when an edit is typed back to its original value', () => {
    const row = sensor();
    const form = { ...formFromSensor(row), name: 'x' };
    expect(isUnchanged(form, row)).toBe(false);
    expect(isUnchanged({ ...form, name: row.name }, row)).toBe(true);
  });
});

describe('OMS-REG-CCE-03.11 / .30 — assigning and clearing a location', () => {
  it('seeds the draft from the sensor’s current assignment', () => {
    expect(formFromSensor(sensor({ location: AT_LOCATION })).locationId).toBe(
      'loc-1'
    );
    expect(formFromSensor(sensor()).locationId).toBe('');
  });

  it('assigns with the wrapper’s value set (.11)', () => {
    const row = sensor();
    const input = buildUpdateInput(
      { ...formFromSensor(row), locationId: 'loc-1' },
      row
    );
    expect(input.locationId).toEqual({ value: 'loc-1' });
  });

  it('clears with the wrapper’s value null, never by omitting it (.30)', () => {
    // Omitting `locationId` means "leave unchanged" on the wire, so a cleared
    // location would silently survive the save (contract › assigning a
    // location). This is the one case where the sparse patch MUST still send
    // the key — the draft changed, it just changed to "none".
    const row = sensor({ location: AT_LOCATION });
    const input = buildUpdateInput(
      { ...formFromSensor(row), locationId: '' },
      row
    );
    expect(input.locationId).toEqual({ value: null });
  });
});

describe('OMS-REG-CCE-03.39 / .40 — retirement is a state, not a deletion', () => {
  it('carries the active state both ways', () => {
    const live = sensor({ isActive: true });
    expect(
      buildUpdateInput({ ...formFromSensor(live), isActive: false }, live)
        .isActive
    ).toBe(false);
    const retired = sensor({ isActive: false });
    expect(
      buildUpdateInput({ ...formFromSensor(retired), isActive: true }, retired)
        .isActive
    ).toBe(true);
  });
});

describe('OMS-REG-CCE-03.24 — names are not unique', () => {
  it('sends a colliding name unchanged — there is nothing to reject it', () => {
    const row = sensor();
    const input = buildUpdateInput(
      { ...formFromSensor(row), name: 'Fridge Tag BM 1' },
      row
    );
    expect(input.name).toBe('Fridge Tag BM 1');
  });
});
