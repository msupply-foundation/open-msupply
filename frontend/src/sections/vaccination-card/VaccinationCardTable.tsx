import { Show, type Component } from 'solid-js';
import { t, tPlural } from '@/intl';
import { localisedDate } from '@/intl/formatDateTime';
import { DataTable, type Column } from '@/ui/elements/table/DataTable';
import { getTextCell } from '@/ui/elements/table/tableHelpers';
import { Alert } from '@/ui/elements/feedback/Alert';
import { StatusChip } from '@/ui/elements/feedback/StatusChip';
import { StatusMarker } from '@/ui/elements/feedback/StatusMarker';
import { Text } from '@/ui/elements/typography/Text';
import { HStack } from '@/ui/layout/Stack/HStack';
import { Stack } from '@/ui/layout/Stack/Stack';
import { AlertTriangleIcon } from '@/ui/icons';
import { remToPx } from '@/ui/utils/rem';
import {
  ageGroupContinues,
  ageGroupLabel,
  canGiveToday,
  cardCounts,
  noStatusLabel,
  reasonLabel,
  STATUS_COLOUR,
  statusLabel,
  waitsFor,
  type CardRow,
} from './cardModel';
import styles from './VaccinationCardTable.module.css';

export interface VaccinationCardTableProps {
  rows: CardRow[];
  /** Not-given reasons by vaccination id. */
  reasons: Record<string, string | null>;
  loading: boolean;
  /** The patient has a date of birth: no status then reads "Not yet due". */
  hasDateOfBirth: boolean;
  /**
   * Opens a dose — only inside an encounter. Omitted, the card is read-only
   * (the card from the patient — rules § where the card opens).
   */
  onOpenDose?: (row: CardRow) => void;
  /** Which rows open the editor (rules § which doses open). */
  doseOpens?: (row: CardRow) => boolean;
  /**
   * Show the card's notices above the table (the patient's card places them in
   * its header).
   */
  notices?: boolean;
}

/**
 * The card's notices (ui-surface § the card's notices): how many doses are
 * overdue, to give as catch-up, and how many can be given today — each only
 * when there are some.
 */
export const VaccinationCardNotices: Component<{ rows: CardRow[] }> = props => {
  const counts = () => cardCounts(props.rows);
  return (
    <Show when={counts().overdue > 0 || counts().dueToday > 0}>
      <Stack gap="sm">
        <Show when={counts().overdue > 0}>
          <Alert
            severity="warning"
            compact
            testId="vaccination-card-overdue-notice"
          >
            {tPlural('messages.doses-past-age-window', counts().overdue)}
          </Alert>
        </Show>
        <Show when={counts().dueToday > 0}>
          <Alert severity="info" compact testId="vaccination-card-due-notice">
            {tPlural('messages.doses-can-be-given-today', counts().dueToday)}
          </Alert>
        </Show>
      </Stack>
    </Show>
  );
};

/*
 * The card's notices and table (spec/vaccination-card ui-surface § the card's
 * notices, § the card table), shared by the card from the patient (S1) and
 * the card inside an immunisation encounter (S2).
 */
export const VaccinationCardTable: Component<
  VaccinationCardTableProps
> = props => {
  const indexOf = (row: CardRow) => props.rows.indexOf(row);

  const columns = (): Column<CardRow, never>[] => [
    {
      // Read down this column: each age once, on the first dose of its group.
      c: { accessor: r => ageGroupLabel(props.rows, indexOf(r)), id: 'age' },
      header: () => t('label.age'),
      ...getTextCell(),
      size: remToPx(8),
      cell: info => (
        <span
          class={styles.age}
          data-age-continues={
            ageGroupContinues(props.rows, indexOf(info.row.original))
              ? ''
              : undefined
          }
        >
          {ageGroupLabel(props.rows, indexOf(info.row.original))}
        </span>
      ),
    },
    {
      c: { accessor: r => r.label, id: 'dose' },
      header: () => t('label.dose'),
      ...getTextCell({ headerPosition: 'primary' }),
      size: remToPx(8),
    },
    {
      c: { id: 'status' },
      header: () => t('label.status'),
      ...getTextCell(),
      size: remToPx(13),
      cell: info => (
        <Show
          when={info.row.original.status}
          fallback={
            <Text variant="bodySmall">
              {noStatusLabel(props.hasDateOfBirth)}
            </Text>
          }
        >
          {status => (
            <HStack gap="sm" align="center" wrap>
              <Show when={status() === 'LATE'}>
                <StatusMarker
                  severity="warning"
                  icon={AlertTriangleIcon}
                  label={t('label.past-age-window')}
                />
              </Show>
              <StatusChip
                label={statusLabel(status())}
                colour={STATUS_COLOUR[status()]}
              />
              <Show when={waitsFor(props.rows, info.row.original)}>
                {dose => (
                  <Text variant="bodySmall">
                    {t('label.waits-for-dose', { dose: dose() })}
                  </Text>
                )}
              </Show>
            </HStack>
          )}
        </Show>
      ),
    },
    {
      c: {
        accessor: r => (r.suggestedDate ? localisedDate(r.suggestedDate) : ''),
        id: 'suggestedDate',
      },
      header: () => t('label.suggested-date'),
      ...getTextCell(),
      size: remToPx(8.5),
    },
    {
      c: {
        accessor: r =>
          r.status === 'GIVEN' && r.vaccinationDate
            ? localisedDate(r.vaccinationDate)
            : '',
        id: 'dateGiven',
      },
      header: () => t('label.date-given'),
      ...getTextCell(),
      size: remToPx(8),
    },
    {
      c: { accessor: r => r.batch ?? '', id: 'batch' },
      header: () => t('label.batch'),
      ...getTextCell(),
      size: remToPx(7.5),
    },
    {
      c: { accessor: r => r.facilityName ?? '', id: 'facility' },
      header: () => t('label.facility'),
      ...getTextCell(),
      size: remToPx(11),
    },
    {
      c: {
        accessor: r =>
          r.status === 'NOT_GIVEN' && r.vaccinationId
            ? reasonLabel(props.reasons[r.vaccinationId])
            : '',
        id: 'reasonNotGiven',
      },
      header: () => t('label.reason-not-given'),
      ...getTextCell({ wrapLines: 2 }),
      size: remToPx(12),
    },
  ];

  const giveToday = (row: CardRow) =>
    canGiveToday(props.rows, row) ? ('unfinished' as const) : undefined;

  return (
    <Stack gap="md">
      <Show when={props.notices !== false}>
        <VaccinationCardNotices rows={props.rows} />
      </Show>
      <div class={styles.card} data-testid="vaccination-card-table">
        <DataTable
          columns={columns()}
          rows={props.rows}
          rowKey={r => r.id}
          loading={props.loading}
          rowTint={giveToday}
          rowAccent={giveToday}
          onRowClick={props.onOpenDose}
          rowClickable={props.doseOpens}
          emptyMessage={t('error.no-items')}
        />
      </div>
    </Stack>
  );
};
