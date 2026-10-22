/*
 * The visit fields of an encounter: its visit date, clinician and status, on
 * the encounter's draft (kdd/custom-forms/specs.md § Forms in the UI). The
 * host renders them around an encounter's form wherever the encounter opens,
 * in the record screen's toolbar and above the form in the patient screen's
 * encounter modal, so the form itself gets the same draft in both mounts and
 * never renders them.
 */
import { Show, type JSX } from 'solid-js';
import { t } from '../../intl';
import type { LocaleKey } from '../../intl/locales';
import { DateTimeField } from '../../ui/elements/inputs/DateTimeField';
import { Select } from '../../ui/elements/selectors/Select';
import { StatusMenu } from '../../ui/elements/feedback/StatusMenu';
import { ClinicianSelect } from '../clinician';
import type { Draft } from '../documentForm/draft';
import type { Encounter, EncounterStatus } from '../../plugin-sdk/documents';
import {
  ENCOUNTER_STATUS_COLOUR,
  encounterDisplayLabel,
  encounterStatusChip,
  SETTABLE_STATUSES,
} from './encounterStatus';

// The statuses a user can set. DELETED is a record's removal, not a visit's
// outcome, and has no place in the picker.
const STATUSES: readonly EncounterStatus[] = [
  'PENDING',
  'VISITED',
  'CANCELLED',
];

const statusLabel = (status: EncounterStatus): string =>
  t(`label.encounter-status-${status.toLowerCase()}` as LocaleKey);

/** The error summary's names for the three, by path. */
export const encounterVisitLabels = (): Record<string, string> => ({
  startDatetime: t('label.visit-date'),
  clinician: t('label.clinician'),
  status: t('label.status'),
});

interface VisitFieldProps {
  draft: Draft<Encounter>;
  /** `small` in a header toolbar. */
  size?: 'small';
}

export const EncounterVisitDateField = (
  props: VisitFieldProps
): JSX.Element => (
  <DateTimeField
    label={t('label.visit-date')}
    size={props.size}
    value={props.draft.data.startDatetime ?? null}
    onChange={v => props.draft.set('startDatetime', v ?? undefined)}
    required
    error={props.draft.errorFor('startDatetime')}
    disabled={props.draft.readOnly()}
    testId="encounter-visit-date"
  />
);

export const EncounterClinicianField = (
  props: VisitFieldProps
): JSX.Element => (
  <ClinicianSelect
    label={t('label.clinician')}
    size={props.size}
    width="full"
    value={props.draft.data.clinician?.id}
    onChange={c =>
      props.draft.set(
        'clinician',
        c
          ? {
              id: c.id,
              firstName: c.firstName ?? undefined,
              lastName: c.lastName,
            }
          : undefined
      )
    }
    disabled={props.draft.readOnly()}
    inputTestId="encounter-clinician"
  />
);

export const EncounterStatusField = (props: VisitFieldProps): JSX.Element => (
  <Select
    label={t('label.status')}
    size={props.size}
    options={STATUSES.map(s => ({ value: s, label: statusLabel(s) }))}
    value={props.draft.data.status}
    onValueChange={v => props.draft.set('status', v as EncounterStatus)}
    error={props.draft.errorFor('status')}
    disabled={props.draft.readOnly()}
    testId="encounter-status"
  />
);

/*
 * The status as the record screen shows it: a chip beside the title that
 * opens the same three choices (internal #468; Product's program-enrolment
 * prototype). The chip reads Missed, in the error tone, for a Scheduled
 * encounter whose visit date has passed — the old client's "Encounter
 * Missed" note — so the menu marks the stored status, not the word shown.
 * Picking a status edits the draft, as the field above does; Save records it.
 */
export const EncounterStatusMenu = (props: {
  draft: Draft<Encounter>;
}): JSX.Element => {
  const chip = () =>
    encounterStatusChip(
      props.draft.data.status,
      props.draft.data.startDatetime,
      new Date()
    );
  return (
    <Show when={chip()}>
      {chip => (
        <StatusMenu
          label={chip().label}
          colour={chip().colour}
          options={SETTABLE_STATUSES.map(s => ({
            value: s,
            label: encounterDisplayLabel(s),
            colour: ENCOUNTER_STATUS_COLOUR[s],
          }))}
          value={props.draft.data.status}
          onSelect={v => props.draft.set('status', v as EncounterStatus)}
          triggerLabel={`${t('label.status')}: ${chip().label}. ${t('label.change-status')}`}
          disabled={props.draft.readOnly()}
          testId="encounter-status"
        />
      )}
    </Show>
  );
};
