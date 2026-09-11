import { describe, expect, it } from 'vitest';
import {
  breachLabelKey,
  breachParts,
  displaySerial,
  equipmentNumbers,
  fullBreachLabelKey,
  latestReadingDatetime,
  latestTemperature,
  SENSOR_TYPES,
  sensorTypeLabelKey,
  type BreachType,
  type SensorRow,
  type SensorType,
} from './sensorDisplay';

// Logic-level coverage of how a sensor's device-owned and derived values are
// presented (spec/cold-chain-sensors § what the device owns / derived values).
//
// Anchors: spec/cold-chain-sensors/cases/OMS-REG-CCE-03.

const sensor = (over: Partial<SensorRow> = {}): SensorRow => ({
  __typename: 'SensorNode',
  id: 'sensor-1',
  name: 'Berlinger 1',
  serial: 'BRL-0001',
  type: 'BERLINGER',
  isActive: true,
  batteryLevel: null,
  location: null,
  assets: { __typename: 'AssetConnector', nodes: [] },
  latestTemperatureLog: { nodes: [] },
  breach: null,
  ...over,
});

describe('OMS-REG-CCE-03.38 — only the identity part of the serial is shown', () => {
  it('drops the trailing space the server’s manufacturer strip leaves behind', () => {
    // The stored serial is "AA:BB:CC:DD:EE:01 | BLUE_MAESTRO"; the resolver's
    // regex is anchored at the pipe, so the separator's leading space survives
    // into the payload (contract ⚠️ wire trap).
    expect(displaySerial('AA:BB:CC:DD:EE:01 ')).toBe('AA:BB:CC:DD:EE:01');
  });

  it('leaves a serial with no manufacturer untouched', () => {
    expect(displaySerial('BRL-0001')).toBe('BRL-0001');
  });
});

describe('the device kind is labelled, never named by its wire value', () => {
  it.each<[SensorType, string]>([
    ['BLUE_MAESTRO', 'label.rtmd'],
    ['LAIRD', 'label.laird'],
    ['BERLINGER', 'label.berlinger'],
    ['LOG_TAG', 'label.log-tag'],
  ])('%s → %s', (type, key) => {
    expect(sensorTypeLabelKey(type)).toBe(key);
  });

  it('offers every kind in the type filter (.15)', () => {
    expect([...SENSOR_TYPES].sort()).toEqual([
      'BERLINGER',
      'BLUE_MAESTRO',
      'LAIRD',
      'LOG_TAG',
    ]);
  });
});

describe('OMS-REG-CCE-03.42 / .43 — the latest reading', () => {
  it('reads the temperature of the newest reading', () => {
    const row = sensor({
      latestTemperatureLog: {
        nodes: [{ temperature: 5.8, datetime: '2026-09-06T09:15:00+00:00' }],
      },
    });
    expect(latestTemperature(row)).toBe(5.8);
    expect(latestReadingDatetime(row)).toBe('2026-09-06T09:15:00+00:00');
  });

  it('is absent — not zero — when the sensor has never reported', () => {
    expect(latestTemperature(sensor())).toBeUndefined();
    expect(latestReadingDatetime(sensor())).toBeUndefined();
  });

  it('is absent when the connector itself is null', () => {
    expect(latestTemperature(sensor({ latestTemperatureLog: null }))).toBe(
      undefined
    );
  });

  it('reports a genuine zero reading as zero', () => {
    const row = sensor({
      latestTemperatureLog: {
        nodes: [{ temperature: 0, datetime: '2026-09-06T09:25:00+00:00' }],
      },
    });
    expect(latestTemperature(row)).toBe(0);
  });
});

describe('OMS-REG-CCE-03.44 / .45 / .48 — the ongoing breach', () => {
  it.each<[BreachType, boolean, boolean]>([
    ['HOT_CONSECUTIVE', true, false],
    ['HOT_CUMULATIVE', true, true],
    ['COLD_CONSECUTIVE', false, false],
    ['COLD_CUMULATIVE', false, true],
  ])('%s splits into hot=%s cumulative=%s', (breach, hot, cumulative) => {
    expect(breachParts(breach)).toEqual({ hot, cumulative });
  });

  it('renders the duration half as the visible word', () => {
    expect(breachLabelKey('HOT_CUMULATIVE')).toBe('label.cumulative');
    expect(breachLabelKey('COLD_CONSECUTIVE')).toBe('label.consecutive');
  });

  it('names the whole breach for assistive tech, so the tone is never alone', () => {
    expect(fullBreachLabelKey('HOT_CONSECUTIVE')).toBe('label.hot-consecutive');
    expect(fullBreachLabelKey('COLD_CUMULATIVE')).toBe('label.cold-cumulative');
  });

  it('reads an excursion as a cold consecutive breach (.48)', () => {
    // Captured as-is: the wire enum pairs direction and duration in one member
    // except EXCURSION, which carries neither.
    expect(breachParts('EXCURSION')).toEqual({ hot: false, cumulative: false });
    expect(breachLabelKey('EXCURSION')).toBe('label.consecutive');
    expect(fullBreachLabelKey('EXCURSION')).toBe('label.cold-consecutive');
  });
});

describe('OMS-REG-CCE-03.46 / .47 — the equipment at the sensor’s location', () => {
  it('is empty when the sensor has no location', () => {
    expect(equipmentNumbers(sensor())).toBe('');
  });

  it('lists the equipment recorded at the location it is assigned to', () => {
    const row = sensor({
      location: { id: 'loc-1', code: 'RS-FR1', name: 'Freezer 1' },
      assets: {
        __typename: 'AssetConnector',
        nodes: [
          { id: 'a1', assetNumber: 'CCE-0001' },
          { id: 'a2', assetNumber: 'CCE-0002' },
        ],
      },
    });
    expect(equipmentNumbers(row)).toBe('CCE-0001, CCE-0002');
  });

  it('skips equipment with no number rather than showing a gap', () => {
    const row = sensor({
      assets: {
        __typename: 'AssetConnector',
        nodes: [
          { id: 'a1', assetNumber: null },
          { id: 'a2', assetNumber: 'CCE-0002' },
        ],
      },
    });
    expect(equipmentNumbers(row)).toBe('CCE-0002');
  });
});
