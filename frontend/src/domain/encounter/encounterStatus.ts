import { t } from '@/intl';
import { encounterStatusLabel, encounterTiming } from './encounterColumns';

/*
 * An encounter's status as the record screen shows it (internal #468,
 * Product's program-enrolment prototype): the stored status, except that a
 * Scheduled encounter whose start has passed reads Missed — the old client's
 * "Encounter Missed" note beside the screen's title, folded into the status
 * chip. The list's timing chip judges the same thing the same way
 * (encounterColumns › encounterTiming).
 */

type StoredStatus = 'PENDING' | 'VISITED' | 'CANCELLED' | 'DELETED';

export type EncounterDisplayStatus = StoredStatus | 'MISSED';

/** The statuses a user can move an encounter to, in the order offered. */
export const SETTABLE_STATUSES: readonly StoredStatus[] = [
  'PENDING',
  'VISITED',
  'CANCELLED',
];

/**
 * The chip's colour for each status. Missed carries the error tone: it is
 * the one status that needs noticing. Cancelled is grey, a closed record —
 * not red, which would read as the same alarm.
 */
export const ENCOUNTER_STATUS_COLOUR: Record<EncounterDisplayStatus, string> = {
  PENDING: 'var(--status-allocated)',
  VISITED: 'var(--status-finalised)',
  MISSED: 'var(--status-overdue)',
  CANCELLED: 'var(--status-new)',
  DELETED: 'var(--status-new)',
};

export const encounterDisplayStatus = (
  status: StoredStatus | null | undefined,
  startDatetime: string | undefined,
  now: Date
): EncounterDisplayStatus | undefined => {
  if (!status) return undefined;
  if (
    status === 'PENDING' &&
    startDatetime &&
    encounterTiming(status, startDatetime, now) === 'missed'
  )
    return 'MISSED';
  return status;
};

/** A display status's word (`label.encounter-status-*`). */
export const encounterDisplayLabel = (
  status: EncounterDisplayStatus
): string =>
  status === 'MISSED'
    ? t('label.encounter-status-missed')
    : encounterStatusLabel(status);

/** The chip for a status: its word and colour. */
export const encounterStatusChip = (
  status: StoredStatus | null | undefined,
  startDatetime: string | undefined,
  now: Date
): { label: string; colour: string } | undefined => {
  const shown = encounterDisplayStatus(status, startDatetime, now);
  if (!shown) return undefined;
  return {
    label: encounterDisplayLabel(shown),
    colour: ENCOUNTER_STATUS_COLOUR[shown],
  };
};
