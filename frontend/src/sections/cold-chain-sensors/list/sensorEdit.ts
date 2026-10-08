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
 * The draft as an update input — **only the fields the user actually changed**.
 *
 * Every key of `UpdateSensorInput` is optional and absence means "leave this
 * alone" (server `sensor/update.rs` → `generate`), so a sparse patch is the
 * shape that says what the user did. Sending the whole draft instead would
 * write back every field as the editor loaded it, and quietly undo anything a
 * second session changed while the modal sat open — a rename here would put the
 * sensor back on the fridge somebody else had just moved it off, with nothing
 * on screen to say so (`.52`).
 *
 * `locationId` is the one field with three states: `{value: id}` assigns,
 * `{value: null}` clears, and omitting it leaves the assignment unchanged
 * (contract › assigning a location). Clearing therefore MUST send the wrapper
 * with a null value — the one thing it must never do is fall back to omitting
 * the key, which would read as "unchanged" and silently keep the location
 * (`.30`).
 *
 * Nothing else is writable: battery level and logging interval have no input
 * field at all, so a save from here cannot move them (`.37`).
 */
export const buildUpdateInput = (
  form: SensorFormState,
  sensor: SensorRow
): UpdateSensorVariables['input'] => {
  const seed = formFromSensor(sensor);
  const input: UpdateSensorVariables['input'] = { id: sensor.id };
  if (form.name !== seed.name) input.name = form.name;
  if (form.isActive !== seed.isActive) input.isActive = form.isActive;
  if (form.locationId !== seed.locationId)
    input.locationId = { value: form.locationId || null };
  return input;
};
