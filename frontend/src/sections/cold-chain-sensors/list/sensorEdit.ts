import type {
  SensorRowFragment,
  UpdateSensorVariables,
} from '../sensors.generated';
import type { SensorType } from './sensorDisplay';

// The S2 editor's form logic (spec/cold-chain-sensors › ui-surface S2) — what
// the user may change, whether anything has changed, and the update input that
// carries it. Framework-free so the three user-owned fields, the confirm gate
// and the location's three-state encoding are testable in node vitest.

export type SensorRow = SensorRowFragment;

/**
 * The editable half of a sensor — its name, where it is, and whether it is in
 * service. Everything else on the row belongs to the device or is derived from
 * the readings and is shown read-only (rules › what the user owns, OMS-REG-CCE-03.10).
 *
 * `locationId` is the empty string for "no location", so the draft is a plain
 * comparable value; the wire's null-vs-absent distinction is made at
 * {@link buildUpdateInput}.
 */
export type SensorFormState = {
  name: string;
  locationId: string;
  isActive: boolean;
};

/** The draft a freshly opened editor starts from. */
export const formFromSensor = (sensor: SensorRow): SensorFormState => ({
  name: sensor.name,
  locationId: sensor.location?.id ?? '',
  isActive: sensor.isActive,
});

/**
 * The device kinds that name themselves. The frontend MUST NOT offer to edit
 * the name of one: the value shown is the device's, and the next thing the
 * device reports would overwrite an edit anyway (rules › naming, .22).
 *
 * A frontend obligation only — the server accepts a name change for any kind
 * (contract › naming a sensor).
 */
const DEVICE_NAMED: readonly SensorType[] = ['BLUE_MAESTRO', 'LAIRD'] as const;

/** Whether this sensor's name is the user's to set (.21/.22). */
export const isNameEditable = (sensor: SensorRow): boolean =>
  !DEVICE_NAMED.includes(sensor.type);

/**
 * Whether the draft still matches the sensor as loaded. The confirming action
 * is unavailable while it does, so an opened-and-closed editor cannot write
 * (.25/.26).
 */
export const isUnchanged = (
  form: SensorFormState,
  sensor: SensorRow
): boolean => {
  const seed = formFromSensor(sensor);
  return (
    form.name === seed.name &&
    form.locationId === seed.locationId &&
    form.isActive === seed.isActive
  );
};

/**
 * The draft as an update input.
 *
 * `locationId` is the one field with three states: `{value: id}` assigns,
 * `{value: null}` clears, and omitting it leaves the assignment unchanged
 * (contract › assigning a location). The editor always states the assignment
 * explicitly — it is a field the user just looked at, so "unchanged" is not a
 * shape this form needs, and sending it means a cleared location really clears
 * (.30).
 *
 * `name` and `isActive` are sent as the draft holds them. Nothing else is
 * writable: battery level and logging interval have no input field at all, so
 * a save from here cannot move them (.37).
 */
export const buildUpdateInput = (
  form: SensorFormState,
  sensorId: string
): UpdateSensorVariables['input'] => ({
  id: sensorId,
  name: form.name,
  isActive: form.isActive,
  locationId: { value: form.locationId || null },
});
