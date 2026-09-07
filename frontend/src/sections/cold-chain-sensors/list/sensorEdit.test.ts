import { describe, expect, it } from 'vitest';
import {
  buildUpdateInput,
  formFromSensor,
  isNameEditable,
  isUnchanged,
  type SensorRow,
} from './sensorEdit';
import type { SensorType } from './sensorDisplay';

// Logic-level coverage of the sensor editor (spec/cold-chain-sensors § what the
// user owns / naming / assigning a location). Tests cite the AC they exercise.

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

describe('AC-N1 / AC-N2 which sensors may be renamed', () => {
  it.each<[SensorType, boolean]>([
    ['BERLINGER', true],
    ['LOG_TAG', true],
    ['BLUE_MAESTRO', false],
    ['LAIRD', false],
  ])('%s name editable: %s', (type, editable) => {
    expect(isNameEditable(sensor({ type }))).toBe(editable);
  });
});

describe('AC-V1 / AC-V2 the device’s own values are never written', () => {
  it('offers only name, location and active state as a draft', () => {
    expect(Object.keys(formFromSensor(sensor())).sort()).toEqual([
      'isActive',
      'locationId',
      'name',
    ]);
  });

  it('sends no battery level or logging interval on a save', () => {
    const input = buildUpdateInput(
      { name: 'renamed', locationId: '', isActive: true },
      'sensor-1'
    );
    expect(Object.keys(input).sort()).toEqual([
      'id',
      'isActive',
      'locationId',
      'name',
    ]);
  });

  it('never carries the serial or the sensor type', () => {
    const input = buildUpdateInput(formFromSensor(sensor()), 'sensor-1');
    expect(input).not.toHaveProperty('serial');
    expect(input).not.toHaveProperty('type');
  });
});

describe('AC-E1 / AC-E2 the confirming action follows the draft', () => {
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

describe('AC-P2 / AC-P3 assigning and clearing a location', () => {
  it('seeds the draft from the sensor’s current assignment', () => {
    expect(formFromSensor(sensor({ location: AT_LOCATION })).locationId).toBe(
      'loc-1'
    );
    expect(formFromSensor(sensor()).locationId).toBe('');
  });

  it('assigns with the wrapper’s value set (AC-P2)', () => {
    const input = buildUpdateInput(
      { name: 'Berlinger 1', locationId: 'loc-1', isActive: true },
      'sensor-1'
    );
    expect(input.locationId).toEqual({ value: 'loc-1' });
  });

  it('clears with the wrapper’s value null, never by omitting it (AC-P3)', () => {
    // Omitting `locationId` means "leave unchanged" on the wire, so a cleared
    // location would silently survive the save (contract › assigning a
    // location).
    const input = buildUpdateInput(
      { name: 'Berlinger 1', locationId: '', isActive: true },
      'sensor-1'
    );
    expect(input.locationId).toEqual({ value: null });
  });
});

describe('AC-A1 / AC-A2 retirement is a state, not a deletion', () => {
  it('carries the active state both ways', () => {
    const off = buildUpdateInput(
      { name: 'n', locationId: '', isActive: false },
      'sensor-1'
    );
    expect(off.isActive).toBe(false);
    const on = buildUpdateInput(
      { name: 'n', locationId: '', isActive: true },
      'sensor-1'
    );
    expect(on.isActive).toBe(true);
  });
});

describe('AC-N4 names are not unique', () => {
  it('sends a colliding name unchanged — there is nothing to reject it', () => {
    const input = buildUpdateInput(
      { name: 'Fridge Tag BM 1', locationId: '', isActive: true },
      'sensor-1'
    );
    expect(input.name).toBe('Fridge Tag BM 1');
  });
});
