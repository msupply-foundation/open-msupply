import type { LocaleKey } from '@/intl/locales';
import type { SensorRowFragment } from '../sensors.generated';

// How a sensor's device-owned and derived values are presented (spec/cold-
// chain-sensors › ui-surface § columns). Framework-free so every mapping —
// device-kind labels, the serial trim, the breach rendering — is unit-testable
// in node without a DOM. Nothing here fetches or formats a number; the view
// supplies the locale-aware formatters.

export type SensorRow = SensorRowFragment;
export type SensorType = SensorRow['type'];
export type BreachType = NonNullable<SensorRow['breach']>;

/**
 * The device kind's label key. `BLUE_MAESTRO` is the wire name of the kind the
 * app calls **mSupply** — the enum member is never shown (contract › what the
 * device owns).
 */
export const sensorTypeLabelKey = (type: SensorType): LocaleKey => {
  switch (type) {
    case 'BLUE_MAESTRO':
      return 'label.rtmd';
    case 'LAIRD':
      return 'label.laird';
    case 'BERLINGER':
      return 'label.berlinger';
    case 'LOG_TAG':
      return 'label.log-tag';
  }
};

/** Every device kind, in the order the type filter offers them. */
export const SENSOR_TYPES: readonly SensorType[] = [
  'BERLINGER',
  'BLUE_MAESTRO',
  'LAIRD',
  'LOG_TAG',
] as const;

/**
 * The serial as a person reads it off the device.
 *
 * The server already strips the manufacturer from the stored `"<identity> |
 * <MANUFACTURER>"`, but its regex is anchored at the pipe, so the separator's
 * leading space survives — `"AA:BB:CC:DD:EE:01 "` (contract ⚠️ wire trap,
 * OMS-REG-CCE-03.38). Invisible on screen but real in the value, so it is trimmed once
 * here rather than at each place the serial is shown, compared, or copied.
 */
export const displaySerial = (serial: string): string => serial.trim();

/**
 * The two halves of a breach kind: its temperature direction and its duration
 * shape. The wire enum pairs them in one member (`HOT_CONSECUTIVE`), except
 * `EXCURSION`, which carries neither — so it reads as a cold consecutive
 * breach, exactly as the current app renders it (rules › derived values,
 * .48). Captured as-is: the excursion kind has no presentation of its own.
 */
export const breachParts = (
  breach: BreachType
): { hot: boolean; cumulative: boolean } => ({
  hot: breach.startsWith('HOT'),
  cumulative: breach.endsWith('CUMULATIVE'),
});

/**
 * The dash a cell carries where a missing value would otherwise read as a
 * failed load — the battery percentage and the latest reading (ui-surface S1
 * § columns). Every other absent value in this list is blank.
 */
export const ABSENT = '\u2014';

/**
 * The breach's FULL name — the marker's accessible label, so the tone never
 * carries the meaning alone. `EXCURSION` has no name of its own and reads as a
 * cold consecutive breach (.48).
 */
export const fullBreachLabelKey = (breach: BreachType): LocaleKey => {
  const { hot, cumulative } = breachParts(breach);
  if (hot) return cumulative ? 'label.hot-cumulative' : 'label.hot-consecutive';
  return cumulative ? 'label.cold-cumulative' : 'label.cold-consecutive';
};

/** The breach's label key — Cumulative or Consecutive (ui-surface § columns). */
export const breachLabelKey = (breach: BreachType): LocaleKey =>
  breachParts(breach).cumulative ? 'label.cumulative' : 'label.consecutive';

/**
 * The most recent reading's temperature, or undefined when the sensor has
 * never reported. `nodes` holds at most the newest one — its `totalCount`
 * counts every reading the sensor ever took and must never be read as a
 * has-a-reading count (contract ⚠️ wire trap, .42/.43).
 */
export const latestTemperature = (row: SensorRow): number | undefined =>
  row.latestTemperatureLog?.nodes[0]?.temperature;

/** When that reading was taken, or undefined when there is none. */
export const latestReadingDatetime = (row: SensorRow): string | undefined =>
  row.latestTemperatureLog?.nodes[0]?.datetime;

/**
 * The cold chain equipment at the sensor's location, comma-separated. Empty
 * when the sensor has no location, because equipment is recorded against the
 * location and not against the sensor (.46/.47).
 */
export const equipmentNumbers = (row: SensorRow): string =>
  row.assets.nodes
    .map(asset => asset.assetNumber)
    .filter((number): number is string => !!number)
    .join(', ');
