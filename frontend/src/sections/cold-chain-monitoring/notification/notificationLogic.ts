import type { UserPermission } from '@/store/storeContext';
import type { TemperatureNotificationsResult } from '../monitoring.generated';
import type {
  MonitoringFilter,
  MonitoringTab,
} from '../monitoring/monitoringState';

// The cold-chain notification band's rules (spec/cold-chain-monitoring rules ›
// the cold-chain notification; ui-surface S5), framework-free so what the band
// shows, when it shows a count, when it withholds its link and what gates it
// are unit-testable in node. The component (ColdChainNotification.tsx) renders
// what these decide.

export type NotificationData =
  TemperatureNotificationsResult['temperatureNotifications'];

export type AlertKind = 'breach' | 'excursion';

/** One node of either connector — the two share this shape on the wire. */
export type AlertNode = NotificationData['breaches']['nodes'][number];

export type BandRow = {
  kind: AlertKind;
  /** The newest outstanding one — the row the band describes. */
  alert: AlertNode;
  /** How many of this kind are outstanding, store-wide. */
  total: number;
};

/**
 * The band's rows: a breach row while any unacknowledged breach on an active
 * sensor is outstanding, an excursion row while any excursion is — each
 * absent when its kind has nothing (`.24`). The counts are `totalCount`, which
 * `page.first` does not bound, so one node per kind is enough (contract › the
 * cold-chain notification). No rows means no band at all — it never occupies
 * space to say all is well (rules).
 */
export const bandRows = (data: NotificationData | undefined): BandRow[] => {
  if (!data) return [];
  const rows: BandRow[] = [];
  const breach = data.breaches.nodes[0];
  if (breach && data.breaches.totalCount > 0)
    rows.push({
      kind: 'breach',
      alert: breach,
      total: data.breaches.totalCount,
    });
  const excursion = data.excursions.nodes[0];
  if (excursion && data.excursions.totalCount > 0)
    rows.push({
      kind: 'excursion',
      alert: excursion,
      total: data.excursions.totalCount,
    });
  return rows;
};

/**
 * One kind's row, or undefined while that kind has nothing outstanding. The
 * band renders its two rows as two fixed blocks over this, so a poll that
 * changes a count updates a row's text in place rather than replacing the
 * row — the polite live region announces the change, and a focused control
 * on the row keeps its focus.
 */
export const bandRow = (
  data: NotificationData | undefined,
  kind: AlertKind
): BandRow | undefined => bandRows(data).find(row => row.kind === kind);

/**
 * The outstanding count is stated only when MORE THAN ONE is outstanding —
 * with a single alert the row itself is the count (rules; `.25`).
 */
export const showsCount = (total: number): boolean => total > 1;

/**
 * The band's gate: the store runs the vaccine module, and the user holds the
 * permission the read itself requires. That is `SENSOR_QUERY`: the server
 * realises the breach-query resource through the sensor permission
 * (`server/service/src/auth.rs` — "temperature breach (uses sensor
 * permissions)"), and the datafile's users hold `SENSOR_QUERY` without ever
 * holding `TEMPERATURE_BREACH_QUERY`. Gating on the same permission the
 * resolver checks means the query is never issued to a user it would refuse,
 * and never withheld from one it would serve. Confirmed live: the read
 * succeeds for a user whose permission list carries only the sensor
 * permissions (BUILD_REPORT › spec refinements — the contract's wire trap has
 * this backwards).
 */
export const NOTIFICATION_PERMISSION: UserPermission = 'SENSOR_QUERY';

export const notificationGate = (
  hasVaccineModule: boolean,
  hasPermission: (permission: UserPermission) => boolean
): boolean => hasVaccineModule && hasPermission(NOTIFICATION_PERMISSION);

/** The band re-reads on this cadence (rules: periodically; 3 minutes). */
export const POLL_INTERVAL_MS = 3 * 60 * 1000;

/** The Monitoring destination's registry path (navConfig). */
export const MONITORING_PATH = 'cold-chain/monitoring';

/**
 * Where each alert's way through leads: a breach to the Breaches tab, an
 * excursion to the Log tab — an excursion is never a row on any tab, so the
 * readings that sustain it are the closest thing to look at (ui-surface S5).
 */
export const detailsTab: Record<AlertKind, MonitoringTab> = {
  breach: 'breaches',
  excursion: 'log',
};

/**
 * The way through is WITHHELD while the user is already looking at that tab,
 * since it would go nowhere (rules; ui-surface S5). "Already there" is the
 * Monitoring screen with that kind's tab active — any other screen, or
 * Monitoring on another tab, still offers it.
 */
export const viewDetailsWithheld = (
  kind: AlertKind,
  current: { relativePath: string; tab: MonitoringTab } | undefined
): boolean =>
  current !== undefined &&
  current.relativePath === MONITORING_PATH &&
  current.tab === detailsTab[kind];

/**
 * The state the way through hands to Monitoring: that kind's tab, narrowed
 * to the alert's sensor by name — the one sensor filter the screen offers, so
 * the narrowing is a visible, removable chip. No date bounds: the alert may
 * be older than any default window, and an address that names a filter is
 * honoured as written (monitoringState › needsArrivalWindow), so the sensor's
 * whole history is what the user lands on.
 */
export const detailsFilter = (alert: AlertNode): MonitoringFilter => ({
  sensorName: alert.sensor?.name ?? null,
  startDatetime: null,
  unacknowledged: null,
});
