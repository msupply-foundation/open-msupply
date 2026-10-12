import { t, tPlural, type LocaleKey } from '@/intl';
import type { VaccinationCardResult } from './vaccinationCard.generated';

/*
 * The card's own reading of its rows (spec/vaccination-card rules § which
 * doses open, § the card at a glance). Status and suggested date are the
 * server's; everything here is derived from them and the rows' order.
 * Pure, so the behaviours it carries are tested in node.
 */

type CardNode = Extract<
  VaccinationCardResult['vaccinationCard'],
  { __typename: 'VaccinationCardNode' }
>;
export type CardRow = CardNode['items'][number];
export type DoseStatus = NonNullable<CardRow['status']>;

/**
 * Days in the average month the server uses (util
 * AVG_NUMBER_OF_DAYS_IN_A_MONTH).
 */
const DAYS_PER_MONTH = 30.4375;
/**
 * Weeks per month for the infant schedule's labels: the course editor's own
 * convention, where a six-week dose is entered as 1.5 months and 6/10/14 weeks
 * as 1.5/2.5/3.5 (spec/immunisation-programs rules § doses).
 */
const WEEKS_PER_MONTH = 4;

/** The rows of a row's own course, in the card's (from-age) order. */
const courseRows = (rows: CardRow[], row: CardRow): CardRow[] =>
  rows.filter(r => r.vaccineCourseId === row.vaccineCourseId);

const isUnrecorded = (status: CardRow['status']): boolean =>
  status === null || status === 'PENDING' || status === 'LATE';

/**
 * The previous dose of the row's course: `undefined` when the row is the
 * course's first dose, else that dose's row.
 */
export const previousDose = (
  rows: CardRow[],
  row: CardRow
): CardRow | undefined => {
  const course = courseRows(rows, row);
  const index = course.findIndex(r => r.id === row.id);
  return index > 0 ? course[index - 1] : undefined;
};

/**
 * Whether the row opens the dose editor inside an encounter: its course
 * allows skipping, it is its course's first dose, or the previous dose is
 * recorded (given or not given) — rules § which doses open.
 */
export const opensInEncounter = (rows: CardRow[], row: CardRow): boolean => {
  if (row.canSkipDose) return true;
  const previous = previousDose(rows, row);
  return previous === undefined || !isUnrecorded(previous.status);
};

/**
 * Recording this dose would skip an earlier one: the previous dose is
 * unrecorded (no status, Pending or Late). Not given is then not offered, and
 * choosing given warns (rules § not given).
 */
export const wouldSkip = (rows: CardRow[], row: CardRow): boolean => {
  const previous = previousDose(rows, row);
  return previous !== undefined && isUnrecorded(previous.status);
};

/**
 * The save asks to confirm a skip only when the previous dose has no record
 * AND no status — a Pending or Late previous dose shows the inline warning
 * alone (rules § before saving).
 */
export const confirmsSkip = (rows: CardRow[], row: CardRow): boolean => {
  const previous = previousDose(rows, row);
  return previous !== undefined && previous.status === null;
};

/**
 * Whether an opened dose is editable: the most recently recorded dose of its
 * course or a later one, or an unrecorded Pending/Late dose. An earlier
 * recorded dose opens read-only (rules § which doses open).
 */
export const isEditable = (rows: CardRow[], row: CardRow): boolean => {
  const course = courseRows(rows, row);
  const index = course.findIndex(r => r.id === row.id);
  const firstUnrecorded = course.findIndex(r => isUnrecorded(r.status));
  const lastRecorded =
    firstUnrecorded === -1 ? course.length - 1 : firstUnrecorded - 1;
  return (
    index >= lastRecorded || row.status === 'PENDING' || row.status === 'LATE'
  );
};

/**
 * A dose that can be given today: Due or Overdue, and it would open inside an
 * encounter (rules § the card at a glance). Marked on both hosts.
 */
export const canGiveToday = (rows: CardRow[], row: CardRow): boolean =>
  (row.status === 'PENDING' || row.status === 'LATE') &&
  opensInEncounter(rows, row);

/**
 * The earlier dose a Due or Overdue dose waits for, when it would not open;
 * undefined otherwise (rules § the card at a glance).
 */
export const waitsFor = (rows: CardRow[], row: CardRow): string | undefined => {
  if (row.status !== 'PENDING' && row.status !== 'LATE') return undefined;
  if (opensInEncounter(rows, row)) return undefined;
  return previousDose(rows, row)?.label;
};

/** The card's counts (rules § the card at a glance). */
export const cardCounts = (rows: CardRow[]) => ({
  given: rows.filter(r => r.status === 'GIVEN').length,
  total: rows.length,
  dueToday: rows.filter(
    r => r.status === 'PENDING' && opensInEncounter(rows, r)
  ).length,
  overdue: rows.filter(r => r.status === 'LATE').length,
});

/**
 * A dose's age, as the Age column shows it: its custom label, else its from
 * age in whole weeks under four months, in months from four months on
 * (ui-surface § the card table).
 */
export const doseAgeLabel = (row: CardRow): string => {
  if (row.customAgeLabel) return row.customAgeLabel;
  if (row.minAgeMonths < 4)
    return tPlural(
      'label.age-weeks-count',
      Math.round(row.minAgeMonths * WEEKS_PER_MONTH)
    );
  return tPlural('label.age-months-count', row.minAgeMonths);
};

/**
 * The Age cell: the label on the first row of its age group only, blank on
 * the rows that repeat it.
 */
export const ageGroupLabel = (rows: CardRow[], index: number): string => {
  const label = doseAgeLabel(rows[index]);
  return index > 0 && doseAgeLabel(rows[index - 1]) === label ? '' : label;
};

/** Whether the next row continues this row's age group. */
export const ageGroupContinues = (rows: CardRow[], index: number): boolean =>
  index + 1 < rows.length &&
  doseAgeLabel(rows[index + 1]) === doseAgeLabel(rows[index]);

const STATUS_KEY: Record<DoseStatus, LocaleKey> = {
  GIVEN: 'label.status-given',
  NOT_GIVEN: 'label.status-not-given',
  PENDING: 'label.status-due',
  LATE: 'label.status-late',
};

/** A status's word on the card. */
export const statusLabel = (status: DoseStatus): string =>
  t(STATUS_KEY[status]);

/** A status's badge colour token. */
export const STATUS_COLOUR: Record<DoseStatus, string> = {
  GIVEN: 'var(--status-finalised)',
  NOT_GIVEN: 'var(--status-cancelled)',
  PENDING: 'var(--status-allocated)',
  LATE: 'var(--status-new)',
};

/**
 * The patient's age as the card's summary states it: weeks under three
 * months, months under two years, then years.
 */
export const patientAgeLabel = (dateOfBirth: string, today: string): string => {
  const days = Math.floor(
    (Date.parse(today) - Date.parse(dateOfBirth)) / 86_400_000
  );
  const months = Math.floor(days / DAYS_PER_MONTH);
  if (months < 3)
    return t('label.age-weeks-short', { count: Math.floor(days / 7) });
  if (months < 24) return t('label.age-months-short', { count: months });
  return t('label.age-years-short', { count: Math.floor(months / 12) });
};

/** The reason codes the editor offers, and their labels. */
export const NOT_GIVEN_REASONS: { value: string; key: LocaleKey }[] = [
  { value: 'REFUSED', key: 'label.refused' },
  { value: 'OUT_OF_STOCK', key: 'label.out-of-stock' },
  { value: 'NO_REASON', key: 'label.no-reason' },
];

/**
 * A recorded reason as the card shows it: an offered code by its label, any
 * other text (the skip fill's sentence, another client's) as written.
 */
export const reasonLabel = (reason: string | null | undefined): string => {
  if (!reason) return '';
  const known = NOT_GIVEN_REASONS.find(r => r.value === reason);
  return known ? t(known.key) : reason;
};

/**
 * A row with no status: "Not yet due" for a patient with a date of birth,
 * blank without one (rules § dose status).
 */
export const noStatusLabel = (hasDateOfBirth: boolean): string =>
  hasDateOfBirth ? t('label.not-yet-due') : '';

/**
 * The dose editor's description line: when the dose is due, and for an
 * Overdue dose that it may be recorded as a catch-up (ui-surface § S3).
 */
export const doseEditorDescription = (row: CardRow): string =>
  [
    t('messages.dose-due-at', { age: doseAgeLabel(row) }),
    row.status === 'LATE' ? t('messages.dose-catch-up') : '',
  ]
    .filter(Boolean)
    .join(' ');
