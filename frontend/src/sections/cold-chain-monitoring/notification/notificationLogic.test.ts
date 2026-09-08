import { describe, expect, it } from 'vitest';
import {
  NOTIFICATION_PERMISSION,
  POLL_INTERVAL_MS,
  bandRows,
  detailsFilter,
  detailsTab,
  notificationGate,
  showsCount,
  viewDetailsWithheld,
  type AlertNode,
  type NotificationData,
} from './notificationLogic';

// The cold-chain notification band's rules (spec/cold-chain-monitoring rules ›
// the cold-chain notification; ui-surface S5), at the logic level.
// Anchors: spec/cold-chain-monitoring/cases/OMS-REG-CCE-02.

const alert = (over: Partial<AlertNode> = {}): AlertNode => ({
  id: 'breach-1',
  sensorId: 'sensor-a',
  sensor: { id: 'sensor-a', name: 'Fridge A' },
  startDatetime: '2026-09-08T06:00:00.000Z',
  location: { id: 'loc-1', name: 'Vaccine fridge' },
  maxOrMinTemperature: 9.5,
  ...over,
});

// An excursion node carries its triggering reading's temperature, which is
// never null on the wire (TemperatureExcursionNode.maxOrMinTemperature is a
// non-null Float).
type ExcursionNode = NotificationData['excursions']['nodes'][number];
const excursion = (over: Partial<ExcursionNode> = {}): ExcursionNode => ({
  ...alert(),
  id: 'log-9',
  maxOrMinTemperature: 25,
  ...over,
});

const data = (
  breaches: { total: number; node?: AlertNode },
  excursions: { total: number; node?: ExcursionNode }
): NotificationData => ({
  __typename: 'TemperatureNotificationConnector',
  breaches: {
    totalCount: breaches.total,
    nodes: breaches.node ? [breaches.node] : [],
  },
  excursions: {
    totalCount: excursions.total,
    nodes: excursions.node ? [excursions.node] : [],
  },
});

describe('OMS-REG-CCE-02.24 — the band appears while breaches or excursions are outstanding', () => {
  it('shows a breach row while unacknowledged breaches exist', () => {
    const rows = bandRows(data({ total: 62, node: alert() }, { total: 0 }));
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ kind: 'breach', total: 62 });
    expect(rows[0]?.alert.sensor?.name).toBe('Fridge A');
  });

  it('shows an excursion row while excursions exist — independently of breaches', () => {
    const rows = bandRows(data({ total: 0 }, { total: 1, node: excursion() }));
    expect(rows.map(r => r.kind)).toEqual(['excursion']);
  });

  it('shows both rows, breach first, when both are outstanding', () => {
    const rows = bandRows(
      data({ total: 2, node: alert() }, { total: 1, node: excursion() })
    );
    expect(rows.map(r => r.kind)).toEqual(['breach', 'excursion']);
  });

  it('is absent entirely when neither is outstanding, or before anything has loaded', () => {
    expect(bandRows(data({ total: 0 }, { total: 0 }))).toEqual([]);
    expect(bandRows(undefined)).toEqual([]);
  });

  it('needs the vaccine module AND the read’s own permission', () => {
    const holding = (p: string) => p === NOTIFICATION_PERMISSION;
    expect(notificationGate(true, holding)).toBe(true);
    expect(notificationGate(false, holding)).toBe(false);
    expect(notificationGate(true, () => false)).toBe(false);
    // The resolver realises the breach-query resource through the SENSOR
    // permission (server auth.rs), so that is the gate — a user holding only
    // TEMPERATURE_BREACH_QUERY would have the read refused.
    expect(NOTIFICATION_PERMISSION).toBe('SENSOR_QUERY');
    expect(notificationGate(true, p => p === 'TEMPERATURE_BREACH_QUERY')).toBe(
      false
    );
  });

  it('re-reads periodically', () => {
    expect(POLL_INTERVAL_MS).toBe(3 * 60 * 1000);
  });
});

describe('OMS-REG-CCE-02.25 — the total is the store’s whole history, shown only above one', () => {
  it('reports the connector’s totalCount, not the rows it happened to return', () => {
    const rows = bandRows(data({ total: 62, node: alert() }, { total: 0 }));
    expect(rows[0]?.total).toBe(62);
  });

  it('states the count only when more than one is outstanding', () => {
    expect(showsCount(1)).toBe(false);
    expect(showsCount(2)).toBe(true);
    expect(showsCount(62)).toBe(true);
  });
});

describe('the way through to the tab that shows each kind', () => {
  it('leads a breach to the Breaches tab and an excursion to the Log tab', () => {
    expect(detailsTab.breach).toBe('breaches');
    expect(detailsTab.excursion).toBe('log');
  });

  it('is withheld only while already on that kind’s tab of Monitoring', () => {
    const monitoring = (tab: 'chart' | 'breaches' | 'log') => ({
      relativePath: 'cold-chain/monitoring',
      tab,
    });
    expect(viewDetailsWithheld('breach', monitoring('breaches'))).toBe(true);
    expect(viewDetailsWithheld('breach', monitoring('log'))).toBe(false);
    expect(viewDetailsWithheld('excursion', monitoring('log'))).toBe(true);
    expect(viewDetailsWithheld('excursion', monitoring('breaches'))).toBe(
      false
    );
    expect(
      viewDetailsWithheld('breach', {
        relativePath: 'cold-chain/sensors',
        tab: 'breaches',
      })
    ).toBe(false);
    expect(viewDetailsWithheld('breach', undefined)).toBe(false);
  });

  it('narrows to the alert’s sensor by name, with no date bounds imposed', () => {
    expect(detailsFilter(alert())).toEqual({
      sensorName: 'Fridge A',
      fromStart: null,
      toStart: null,
      unacknowledged: null,
    });
    expect(detailsFilter(alert({ sensor: null })).sensorName).toBeNull();
  });
});

describe('temperature on the band — absence, not falsiness', () => {
  it('carries a 0 °C reading through as a number, distinct from none', () => {
    const zero = bandRows(
      data({ total: 1, node: alert({ maxOrMinTemperature: 0 }) }, { total: 0 })
    );
    expect(zero[0]?.alert.maxOrMinTemperature).toBe(0);
    const none = bandRows(
      data(
        { total: 1, node: alert({ maxOrMinTemperature: null }) },
        { total: 0 }
      )
    );
    expect(none[0]?.alert.maxOrMinTemperature).toBeNull();
  });
});
