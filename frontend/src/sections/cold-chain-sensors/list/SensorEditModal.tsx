import { createResource, createSignal, Show } from 'solid-js';
import type { Component } from 'solid-js';
import { graphqlFetch } from '@/api/graphql';
import { gated } from '@/api/gated';
import { formatNumber, localisedDateTime, t } from '@/intl';
import { Dialog } from '@/ui/elements/feedback/Dialog';
import { ConfirmDialog } from '@/ui/elements/feedback/ConfirmDialog';
import { createFocusTarget } from '@/ui/utils/createFocusTarget';
import { CancelButton, OkButton } from '@/ui/elements/buttons/StandardButtons';
import { TextField } from '@/ui/elements/inputs/TextField';
import { ToggleSwitch } from '@/ui/elements/inputs/ToggleSwitch';
import { LabelledValue } from '@/ui/elements/typography/LabelledValue';
import { FieldRow } from '@/ui/elements/inputs/FieldRow';
import { LocationSelect, fetchLocations } from '@/domain/location';
import type { Location } from '@/domain/location';
import { UpdateSensor } from '../sensors.generated';
import {
  ABSENT,
  displaySerial,
  equipmentNumbers,
  latestReadingDatetime,
  latestTemperature,
  sensorTypeLabelKey,
} from './sensorDisplay';
import {
  buildUpdateInput,
  formFromSensor,
  isNameEditable,
  isUnchanged,
  type SensorFormState,
  type SensorRow,
} from './sensorEdit';

// S2 — the sensor details modal (spec/cold-chain-sensors, ui-surface S2), with
// its save confirmation (S3) layered over it. The list mounts it fresh per open
// (a <Show> around it), so the form seeds once from the clicked row.
//
// Three rows are controls — the name, the location, and whether the sensor is
// in service. Everything else the device reports or the readings derive, shown
// as read-only labelled values, never as disabled inputs (AC-V1;
// ui-standards/detail-views § never-editable fields).

export interface SensorEditModalProps {
  storeId: string;
  /** Snapshot at open — the modal seeds its form from it once. */
  sensor: SensorRow;
  onClose: () => void;
  /** A save landed — the list re-queries so the row reflects it. */
  onSaved: () => void;
}

export const SensorEditModal: Component<SensorEditModalProps> = props => {
  const [form, setForm] = createSignal<SensorFormState>(
    formFromSensor(props.sensor)
  );
  // True while the mutation is in flight: drives the confirm button's spinner
  // and blocks re-entry / dismissal (ui-standards/controls § dialogs).
  const [saving, setSaving] = createSignal(false);
  // The S3 "Are you sure?" step. Confirming the modal asks first; nothing is
  // written until that is accepted (AC-E3).
  const [confirming, setConfirming] = createSignal(false);

  // The modal's initial focus. The name field where it is editable; otherwise
  // the location picker, which is then the first thing the user can act on
  // (a device-named sensor is opened to place it, not to rename it).
  const nameField = createFocusTarget();
  const locationField = createFocusTarget();

  /*
   * The location picker's options — the ACTIVE STORE's locations, which is the
   * frontend's own obligation: the server accepts any location it is sent,
   * including another store's (rules › assigning a location, AC-P1).
   *
   * Read WITHOUT suspending: this modal renders under AppShell's <Suspense>,
   * and a pending read there would remount the section and reset the form
   * (kdd/solid-reactivity-pitfalls § no remounts).
   */
  const [locationData] = createResource(
    () => props.storeId,
    storeId => fetchLocations(storeId)
  );
  const locations = (): Location[] => gated(locationData) ?? [];

  const nameEditable = () => isNameEditable(props.sensor);
  const unchanged = () => isUnchanged(form(), props.sensor);

  const temperature = () => latestTemperature(props.sensor);
  const readingDatetime = () => latestReadingDatetime(props.sensor);

  const save = async () => {
    if (saving() || unchanged()) return; // re-entry guard + AC-E1
    setSaving(true);
    const result = await graphqlFetch(UpdateSensor, {
      storeId: props.storeId,
      input: buildUpdateInput(form(), props.sensor.id),
    });
    setSaving(false);
    // Every rejection this vertical can produce is untyped — the mutation's
    // declared error members are all unreachable, so a failure fails the whole
    // request and the global error path has already surfaced it (contract › the
    // error union is decorative). Stay open so the entries aren't lost.
    if (result.kind !== 'success') return;
    props.onSaved();
    props.onClose();
  };

  return (
    <>
      <Dialog
        open
        initialFocus={nameEditable() ? nameField : locationField}
        testId="sensor-edit-modal"
        title={t('title.sensor-details')}
        dismissable={!saving()}
        onClose={props.onClose}
        // Room for the location picker's open listbox inside the dialog: it
        // sits second from the top with seven read-only rows below it (#1029).
        minBodyHeightRem={30}
        actions={
          <>
            <Show when={!saving()}>
              <CancelButton
                data-testid="dialog-button-cancel"
                onClick={props.onClose}
              />
            </Show>
            {/* Inert until the draft differs from the sensor as loaded, so an
                opened-and-closed editor cannot write (AC-E1/AC-E2). */}
            <OkButton
              data-testid="dialog-button-ok"
              loading={saving()}
              disabled={unchanged() || saving()}
              onClick={() => setConfirming(true)}
            />
          </>
        }
      >
        {/* Body, top to bottom, per ui-surface S2 § layout: the three controls
            first, then what the device reports. Each row is a labelled field
            row, so the read-only values line up with the controls above them. */}
        <FieldRow label={t('label.sensor-name')}>
          <TextField
            ref={nameField.ref}
            data-testid="sensor-name-input"
            label={t('label.sensor-name')}
            hideLabel
            // A device-named kind names itself; the frontend never offers to
            // edit it (AC-N2). Not a validation — there is nothing to correct,
            // the value simply is not the user's.
            disabled={!nameEditable() || saving()}
            value={form().name}
            onInput={e => setForm({ ...form(), name: e.currentTarget.value })}
          />
        </FieldRow>
        <FieldRow label={t('label.location')}>
          <LocationSelect
            label={t('label.location')}
            hideLabel
            focusTarget={locationField}
            inputTestId="sensor-location-input"
            locations={locations()}
            loading={locationData.loading}
            disabled={saving()}
            value={form().locationId || undefined}
            // Clearable, because the assignment is optional — clearing it is
            // how a sensor comes off a location (AC-P3).
            onChange={location =>
              setForm({ ...form(), locationId: location?.id ?? '' })
            }
          />
        </FieldRow>
        <LabelledValue variant="field" label={t('label.cce')}>
          {equipmentNumbers(props.sensor) || ABSENT}
        </LabelledValue>
        <LabelledValue variant="field" label={t('label.serial')}>
          {displaySerial(props.sensor.serial)}
        </LabelledValue>
        <LabelledValue variant="field" label={t('label.battery-level')}>
          {props.sensor.batteryLevel == null
            ? ABSENT
            : `${formatNumber(props.sensor.batteryLevel)}%`}
        </LabelledValue>
        <LabelledValue variant="field" label={t('label.last-reading')}>
          {temperature() === undefined
            ? ABSENT
            : formatNumber(temperature(), {
                style: 'unit',
                unit: 'celsius',
                unitDisplay: 'short',
                maximumFractionDigits: 2,
              })}
        </LabelledValue>
        <LabelledValue variant="field" label={t('label.last-record')}>
          {readingDatetime() ? localisedDateTime(readingDatetime()!) : ABSENT}
        </LabelledValue>
        <LabelledValue variant="field" label={t('label.sensor-type')}>
          {t(sensorTypeLabelKey(props.sensor.type))}
        </LabelledValue>
        <FieldRow label={t('label.active')}>
          <ToggleSwitch
            label={t('label.active')}
            hideLabel
            testId="sensor-active-toggle"
            disabled={saving()}
            checked={form().isActive}
            onChange={isActive => setForm({ ...form(), isActive })}
          />
        </FieldRow>
      </Dialog>
      {/* S3 — the save confirmation. Declining returns to S2 with the draft
          intact; accepting saves and closes both (AC-E3). */}
      <ConfirmDialog
        open={confirming()}
        onClose={() => setConfirming(false)}
        message={t('messages.confirm-sensor-update')}
        onConfirm={() => void save()}
      />
    </>
  );
};
