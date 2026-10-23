import { t } from '@/intl';
import type { LocaleKey } from '@/intl/locales';
import type { Column } from '@/ui/elements/table/DataTable';
import {
  getCellDefinition,
  getTextCell,
} from '@/ui/elements/table/tableHelpers';
import { getChipListCell } from '@/ui/elements/table/ChipListCell';
import { remToPx } from '@/ui/utils/rem';
import {
  dateToIsoDate,
  utcToLocalDay,
} from '@/ui/elements/inputs/dateTimeConvert';
import { statusEventTexts } from '@/domain/program/programEvents';
import type { EncounterStatus } from '@/plugin-sdk/documents';

/*
 * The encounter columns (spec/encounters/ui-surface.md S1 › columns), shared
 * by the global encounter list and the patient's Encounters tab, which shows
 * them without Patient. Rows are each screen's own generated query rows; this
 * names only the fields the columns read.
 */

export type EncounterColumnRow = {
  id: string;
  type: string;
  startDatetime: string;
  status: EncounterStatus | null;
  contextId: string;
  documentRegistry: { name: string | null } | null;
  activeProgramEvents: {
    nodes: readonly { type: string; data: string | null }[];
  };
};

/** The list's sort keys (EncounterSortFieldInput) for its sortable columns. */
export type EncounterSortKey = 'Type' | 'Program' | 'startDatetime' | 'status';

/** A pending encounter reads Scheduled (`label.encounter-status-pending`). */
export const encounterStatusLabel = (status: EncounterStatus | null): string =>
  status
    ? t(`label.encounter-status-${status.toLowerCase()}` as LocaleKey)
    : '';

/**
 * A Scheduled encounter's timing: missed once the day of its start has
 * passed, scheduled while that day is still ahead, judged against `now` by
 * the device's local calendar day (spec/encounters/rules.md § additional
 * information). A visit due today is neither: it is the day's work, not a
 * visit missed by the hour — a New encounter opens with its start about
 * now, and must not greet the clinician with an alarm. Any other status has
 * none.
 */
export const encounterTiming = (
  status: EncounterStatus | null,
  startDatetime: string,
  now: Date
): 'missed' | 'scheduled' | undefined => {
  if (status !== 'PENDING') return undefined;
  const day = utcToLocalDay(startDatetime);
  if (!day) return undefined;
  const today = dateToIsoDate(now);
  if (day < today) return 'missed';
  if (day > today) return 'scheduled';
  return undefined;
};

/** The Additional info chips: the status events, then the timing chip. */
export const encounterAdditionalInfo = (
  row: Pick<EncounterColumnRow, 'status' | 'startDatetime'> & {
    activeProgramEvents: EncounterColumnRow['activeProgramEvents'];
  },
  now: Date
): string[] => {
  const timing = encounterTiming(row.status, row.startDatetime, now);
  const timingChip =
    timing === undefined
      ? []
      : [
          `${t('label.encounter')} ${t(
            timing === 'missed'
              ? 'label.encounter-status-missed'
              : 'label.encounter-status-scheduled'
          )}`,
        ];
  return [...statusEventTexts(row.activeProgramEvents.nodes), ...timingChip];
};

/**
 * The Program column's text: the name of the enrolment registry in each
 * context, the name the patient's Programs tab shows, as the old client's
 * list names it (spec/encounters/contract.md).
 */
export const enrolmentNameByContext = (
  registries: readonly { contextId: string; name: string | null }[]
): ((contextId: string) => string) => {
  const names = new Map<string, string>();
  for (const registry of registries)
    if (registry.name && !names.has(registry.contextId))
      names.set(registry.contextId, registry.name);
  return contextId => names.get(contextId) ?? '';
};

export const encounterColumns = <R extends EncounterColumnRow>(options: {
  /** The enrolment name for a context (see enrolmentNameByContext). */
  programName: (contextId: string) => string;
  /** The patient's name, for the global list; omitted, no Patient column. */
  patientName?: (row: R) => string;
  /** Header sorting, for a screen that sorts on the server. */
  sortable?: boolean;
}): Column<R, EncounterSortKey>[] => {
  const sortKey = (key: EncounterSortKey) =>
    options.sortable ? { sortKey: key } : {};
  const patientName = options.patientName;
  return [
    {
      c: {
        accessor: r => r.documentRegistry?.name ?? r.type,
        id: 'type',
      },
      ...sortKey('Type'),
      header: () => t('label.encounter-type'),
      ...getTextCell(),
      size: remToPx(14),
      meta: { headerPosition: 'primary' },
    },
    {
      c: {
        accessor: r => options.programName(r.contextId),
        id: 'program',
      },
      ...sortKey('Program'),
      header: () => t('label.program'),
      ...getTextCell(),
      size: remToPx(14),
    },
    {
      c: { key: 'startDatetime' },
      ...sortKey('startDatetime'),
      header: () => t('label.date'),
      ...getCellDefinition('startDatetime'),
    },
    ...(patientName
      ? [
          {
            c: { accessor: patientName, id: 'patient' },
            header: () => t('label.patient'),
            ...getTextCell(),
            size: remToPx(14),
          } satisfies Column<R, EncounterSortKey>,
        ]
      : []),
    {
      c: { accessor: r => encounterStatusLabel(r.status), id: 'status' },
      ...sortKey('status'),
      header: () => t('label.status'),
      ...getTextCell(),
      size: remToPx(8),
    },
    {
      c: {
        accessor: r => encounterAdditionalInfo(r, new Date()),
        id: 'additionalInfo',
      },
      header: () => t('label.additional-info'),
      ...getChipListCell(),
      size: remToPx(18),
    },
  ];
};
