import { createResource, createSignal, Show } from 'solid-js';
import type { Component } from 'solid-js';
import { graphqlFetch } from '../../../api/graphql';
import { t } from '../../../intl';
import { Dialog } from '../../../ui/elements/feedback/Dialog';
import { Alert } from '../../../ui/elements/feedback/Alert';
import { Button } from '../../../ui/elements/buttons/Button';
import { CheckboxButton } from '../../../ui/elements/buttons/CheckboxButton';
import { TextField } from '../../../ui/elements/inputs/TextField';
import { NumberField } from '../../../ui/elements/inputs/NumberField';
import { Combobox } from '../../../ui/elements/selectors/Combobox';
import {
  ArrowRightIcon,
  CheckIcon,
  PlusCircleIcon,
  XCircleIcon,
} from '../../../ui/icons';
import {
  InsertLocation,
  LocationTypes,
  UpdateLocation,
  type LocationTypesResult,
} from './locations.generated';
import {
  EMPTY_FORM,
  buildInsertInput,
  buildUpdateInput,
  formFromLocation,
  isFormValid,
  nextLocation,
  saveRejection,
  type LocationFormState,
  type LocationRow,
  type SaveRejection,
} from './locationEdit';
import { locationTypeLabel } from './locationTypeLabel';
import styles from './LocationEditModal.module.css';

// The S2 create/edit modal (spec/locations/ui-surface.md) — ONE surface for
// both modes, the title telling them apart. The list mounts it fresh per open
// (a <Show> around it, like the reference vertical's action dialogs), so the
// form seeds once from the opening state; OK-&-next advances INSIDE the
// mounted modal by explicit reseeding — an interaction never remounts the
// form (kdd/solid-reactivity-pitfalls § no remounts).

/** What the modal was opened on: a fresh create, or a clicked list row. */
export type EditorState =
  { mode: 'create' } | { mode: 'edit'; location: LocationRow };

type LocationType = LocationTypesResult['locationTypes']['nodes'][number];

export interface LocationEditModalProps {
  storeId: string;
  /** Snapshot at open — the modal seeds its form from it once. */
  editor: EditorState;
  /**
   * The list's current rows, in display order — OK-&-next in edit mode
   * advances to the row after the current one (AC-C5); disabled on the last.
   */
  rows: () => LocationRow[];
  onClose: () => void;
  /** A save landed — the list re-queries so the rows reflect it. */
  onSaved: () => void;
}

export const LocationEditModal: Component<LocationEditModalProps> = props => {
  // The record being edited — starts as the opening state and advances on
  // OK-&-next (edit → the next list row; create stays create with a fresh
  // form). A signal, not a keyed <Show>: advancing is an interaction, so the
  // form is reseeded explicitly instead of remounted.
  const [current, setCurrent] = createSignal<EditorState>(props.editor);
  const [form, setForm] = createSignal<LocationFormState>(
    props.editor.mode === 'edit'
      ? formFromLocation(props.editor.location)
      : EMPTY_FORM
  );
  // Which affordance is mid-save ('ok' | 'next'), or null. Drives each
  // button's own busy spinner and blocks re-entry / dismissal while a
  // mutation is in flight (ui-standards/controls.md § dialogs, D22).
  const [saving, setSaving] = createSignal<'ok' | 'next' | null>(null);
  // The inline save-rejection banner (duplicate code, wrong store, …) — the
  // dialog stays open with entries intact (AC-C4/AC-E2/AC-E3, D21/D22).
  const [rejection, setRejection] = createSignal<SaveRejection>();

  // The location-type picker's options (consumed `locationTypes` read —
  // contract.md § contract surface). Fetched once per store; read WITHOUT
  // suspending — this modal renders under AppShell's <Suspense>, and a pending
  // read there would remount the section and reset the form
  // (kdd/solid-reactivity-pitfalls § no remounts).
  const [typesData] = createResource(
    () => props.storeId,
    async storeId => {
      const result = await graphqlFetch(LocationTypes, { storeId });
      if (result.kind !== 'success') return undefined;
      return result.data.locationTypes.nodes;
    }
  );
  const locationTypes = (): LocationType[] =>
    typesData.state === 'ready' || typesData.state === 'refreshing'
      ? (typesData.latest ?? [])
      : [];

  const isEdit = () => current().mode === 'edit';
  const editedLocation = (): LocationRow | undefined => {
    const state = current();
    return state.mode === 'edit' ? state.location : undefined;
  };

  // Volume used is server-derived and read-only everywhere (AC-V1): shown from
  // the clicked row in edit mode, 0 on a fresh create — never an input value
  // that could be sent.
  const volumeUsed = () => editedLocation()?.volumeUsed ?? 0;

  // OK-&-next: in edit, the next list location (none on the last row — the
  // button disables); in create, always available (a fresh blank form follows).
  const nextRow = (): LocationRow | undefined => {
    const location = editedLocation();
    return location ? nextLocation(props.rows(), location.id) : undefined;
  };
  const nextDisabled = () => isEdit() && nextRow() === undefined;

  const rejectionMessage = (): string | undefined => {
    const r = rejection();
    if (!r) return undefined;
    return r.kind === 'duplicateCode'
      ? t('error.unique-value-violation', { field: t('label.code') })
      : r.description;
  };

  const save = async (advance: boolean) => {
    if (saving() || !isFormValid(form())) return; // re-entry guard + AC-C3
    setSaving(advance ? 'next' : 'ok');
    setRejection(undefined);
    // Snapshot the advance target BEFORE the list refetches under us.
    const next = advance ? nextRow() : undefined;

    const location = editedLocation();
    let failed: SaveRejection | undefined;
    if (location) {
      // Edit: the FULL current field set every save — an omitted
      // locationTypeId would silently clear the type (AC-E4, contract.md
      // ⚠️ wire trap).
      const result = await graphqlFetch(UpdateLocation, {
        storeId: props.storeId,
        input: buildUpdateInput(form(), location.id),
      });
      if (result.kind !== 'success') {
        // Transport/unexpected → the global error modal already surfaced it;
        // stay open so entries aren't lost.
        setSaving(null);
        return;
      }
      if (result.data.updateLocation.__typename === 'UpdateLocationError') {
        failed = saveRejection(result.data.updateLocation.error);
      }
    } else {
      // Create: client-generated id (rules.md § identity).
      const result = await graphqlFetch(InsertLocation, {
        storeId: props.storeId,
        input: buildInsertInput(form(), crypto.randomUUID()),
      });
      if (result.kind !== 'success') {
        setSaving(null);
        return;
      }
      if (result.data.insertLocation.__typename === 'InsertLocationError') {
        failed = saveRejection(result.data.insertLocation.error);
      }
    }

    setSaving(null);
    if (failed) {
      // Rejected (duplicate code, wrong store, …): inline banner, dialog stays
      // open with entries intact (D22).
      setRejection(failed);
      return;
    }

    props.onSaved();
    if (!advance) {
      // Success closes the dialog — closure IS the confirmation (D21).
      props.onClose();
      return;
    }
    // OK & next (AC-C5): advance without returning to the list — edit moves to
    // the next list location, create resets to a fresh blank form.
    if (next) {
      setCurrent({ mode: 'edit', location: next });
      setForm(formFromLocation(next));
    } else {
      setCurrent({ mode: 'create' });
      setForm(EMPTY_FORM);
    }
  };

  return (
    <Dialog
      open
      testId="location-edit-modal"
      title={isEdit() ? t('label.edit-location') : t('label.create-location')}
      icon={isEdit() ? undefined : <PlusCircleIcon />}
      // Blocking while a mutation is in flight (no scrim/Escape exit until it
      // resolves).
      dismissable={saving() === null}
      onClose={props.onClose}
      // The save-rejection banner pins above the actions, inside the modal
      // (ui-surface S3 § save errors).
      footer={
        <Show when={rejectionMessage()}>
          {message => (
            <Alert severity="error" testId="location-save-error">
              {message()}
            </Alert>
          )}
        </Show>
      }
      actions={
        <>
          <Show when={saving() === null}>
            <Button
              variant="secondary"
              icon={<XCircleIcon />}
              data-testid="dialog-button-cancel"
              onClick={props.onClose}
            >
              {t('button.cancel')}
            </Button>
          </Show>
          <Button
            icon={<CheckIcon />}
            data-testid="dialog-button-ok"
            loading={saving() === 'ok'}
            disabled={!isFormValid(form()) || saving() !== null}
            onClick={() => void save(false)}
          >
            {t('button.ok')}
          </Button>
          <Button
            icon={<ArrowRightIcon />}
            iconPosition="end"
            data-testid="dialog-button-next-and-ok"
            loading={saving() === 'next'}
            disabled={
              !isFormValid(form()) || saving() !== null || nextDisabled()
            }
            onClick={() => void save(true)}
          >
            {t('button.ok-and-next')}
          </Button>
        </>
      }
    >
      {/* Body, top to bottom, per ui-surface S2 § layout. Each field stands
          alone, so it uses the control's built-in label (ui-standards). */}
      <TextField
        label={t('label.name')}
        required
        autofocus
        disabled={saving() !== null}
        value={form().name}
        onInput={e => setForm({ ...form(), name: e.currentTarget.value })}
      />
      <TextField
        label={t('label.code')}
        required
        disabled={saving() !== null}
        value={form().code}
        onInput={e => setForm({ ...form(), code: e.currentTarget.value })}
      />
      {/* Optional and clearable (D5 — clearability follows optionality; the
          Combobox shows its clear × on a committed selection). Options are the
          store's location types as name + temperature range. */}
      <Combobox<LocationType>
        label={t('label.location-type')}
        items={locationTypes()}
        loading={typesData.loading}
        disabled={saving() !== null}
        itemToString={locationTypeLabel}
        itemToValue={type => type.id}
        value={form().locationTypeId || undefined}
        onChange={type =>
          setForm({ ...form(), locationTypeId: type?.id ?? '' })
        }
      />
      <div class={styles.volumeRow}>
        {/* label.volume carries the m³ unit ("Volume (m³)"). */}
        <NumberField
          label={t('label.volume')}
          decimalLimit={10}
          disabled={saving() !== null}
          value={form().volume}
          onChange={volume => setForm({ ...form(), volume })}
        />
        {/* Server-derived, rendered disabled/read-only — no input carries it
            (AC-V1). */}
        <NumberField
          label={t('label.volume-used')}
          decimalLimit={10}
          disabled
          value={volumeUsed()}
        />
      </div>
      <CheckboxButton
        checked={form().onHold}
        disabled={saving() !== null}
        data-testid="on-hold-button"
        onChange={onHold => setForm({ ...form(), onHold })}
      >
        {t('label.on-hold')}
      </CheckboxButton>
    </Dialog>
  );
};
