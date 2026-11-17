import { createResource, createSignal, For, Show, untrack } from 'solid-js';
import type { SetStoreFunction } from 'solid-js/store';
import { graphqlFetch } from '@/api/graphql';
import { formatNumber, t, tPlural } from '@/intl';
import { DetailCard } from '@/ui/layout/Detail/DetailCard';
import { Stack } from '@/ui/layout/Stack/Stack';
import { HStack } from '@/ui/layout/Stack/HStack';
import { Text } from '@/ui/elements/typography/Text';
import { Checkbox } from '@/ui/elements/inputs/Checkbox';
import { TextField } from '@/ui/elements/inputs/TextField';
import { Select } from '@/ui/elements/selectors/Select';
import { Table } from '@/ui/elements/table/Table';
import { Button } from '@/ui/elements/buttons/Button';
import { Alert } from '@/ui/elements/feedback/Alert';
import { createDebounced } from '@/ui/utils/createDebounced';
import {
  CentralDataExport,
  CentralDataExportCounts,
} from './centralData.generated';
import {
  TABLES,
  exportInputs,
  exportOutcome,
  hasFilters,
  unwrap,
  type Status,
  type TableFilter,
} from './centralDataLogic';
import { saveStoredFile } from './saveStoredFile';

// S1's export card (spec/central-data/ui-surface.md § export card): one row
// per table with its filters and how many records they match, then Download.

/** How long typing in a search box waits before the counts are asked again. */
const COUNT_DELAY_MS = 300;

export const ExportCard = (props: {
  /** Held by the page, so they survive the tab unmounting. */
  filters: TableFilter[];
  setFilters: SetStoreFunction<TableFilter[]>;
}) => {
  const [downloading, setDownloading] = createSignal(false);
  const [exportError, setExportError] = createSignal<string>();

  // The counts follow a copy of the filters that typing updates only after a
  // pause, so a search doesn't ask the server once per keystroke.
  // Read once per mount, so reopening the tab after an import recounts.
  const [counted, setCounted] = createSignal(
    untrack(() => exportInputs(props.filters))
  );
  const countNow = () => setCounted(exportInputs(props.filters));
  const countSoon = createDebounced(countNow, COUNT_DELAY_MS);
  const [countsResult] = createResource(
    () => (counted().length > 0 ? counted() : false),
    tables =>
      graphqlFetch(CentralDataExportCounts, { tables }, { background: true })
  );
  // First fetched on a tick, under an open screen: read without suspending.
  const countsReply = () => {
    const state = countsResult.state;
    return state === 'ready' || state === 'refreshing'
      ? countsResult.latest
      : undefined;
  };
  const counts = () => {
    const result = countsReply();
    return result?.kind === 'success'
      ? result.data.centralServer.centralData.exportCounts
      : undefined;
  };
  // A background call, so a failure reaches no global modal: the card says so.
  // With nothing ticked nothing is counted, so an old failure no longer applies.
  const countsFailed = () => {
    const result = countsReply();
    return (
      tickedCount() > 0 && result !== undefined && result.kind !== 'success'
    );
  };
  const countFor = (index: number) => {
    const filter = props.filters[index];
    if (!filter.ticked) return undefined;
    return counts()?.tables.find(count => count.table === filter.table);
  };
  // A plain expression, not a <Show> callback: that runs once, so its text
  // would keep the first count.
  const rowsText = (index: number) => {
    const count = countFor(index);
    if (!count) return '—';
    return count.matching === count.total
      ? formatNumber(count.total)
      : t('label.count-of-total', {
          matching: formatNumber(count.matching),
          total: formatNumber(count.total),
        });
  };
  const tickedCount = () =>
    props.filters.filter(filter => filter.ticked).length;
  const rowTotal = () => {
    let total = 0;
    for (let index = 0; index < props.filters.length; index++)
      total += countFor(index)?.matching ?? 0;
    return total;
  };
  const overCap = () => {
    const maxRows = counts()?.maxRows;
    return maxRows !== undefined && rowTotal() > maxRows;
  };

  const statusOptions = () => [
    { value: 'ALL', label: t('label.all') },
    { value: 'ACTIVE', label: t('label.active') },
    { value: 'INACTIVE', label: t('label.inactive') },
  ];
  const isStatus = (value: string): value is Status =>
    value === 'ALL' || value === 'ACTIVE' || value === 'INACTIVE';

  const tooManyRows = (rowCount: number, maxRows: number) =>
    t('error.central-data-export-too-many-rows', {
      rowCount: formatNumber(rowCount),
      maxRows: formatNumber(maxRows),
    });

  const clearFilters = () => {
    countSoon.cancel();
    props.setFilters({}, { contains: '', status: 'ALL' });
    countNow();
  };

  const download = async () => {
    setDownloading(true);
    setExportError(undefined);
    const outcome = exportOutcome(
      unwrap(
        await graphqlFetch(CentralDataExport, {
          tables: exportInputs(props.filters),
        }),
        data => data.centralServer.centralData.export
      )
    );
    // A failed call is reported by the global error modal.
    if (outcome.kind === 'tooManyRows')
      setExportError(tooManyRows(outcome.rowCount, outcome.maxRows));
    if (outcome.kind === 'file')
      setExportError(await saveStoredFile(outcome.fileId, 'central_data.xlsx'));
    setDownloading(false);
  };

  return (
    <DetailCard>
      <Stack>
        <Text>{t('messages.central-data-export-help')}</Text>
        <Table label={t('button.export')} density="comfortable">
          <thead>
            <tr>
              <th>{t('label.table')}</th>
              <th data-control>{t('label.search')}</th>
              <th data-control>{t('label.status')}</th>
              <th data-numeric>{t('label.rows')}</th>
            </tr>
          </thead>
          <tbody>
            <For each={TABLES}>
              {(table, index) => {
                const filter = () => props.filters[index()];
                const id = table.value.toLowerCase();
                return (
                  <tr>
                    <td>
                      <Checkbox
                        label={t(table.labelKey)}
                        checked={filter().ticked}
                        testId={`central-data-export-${id}`}
                        onChange={checked => {
                          props.setFilters(index(), 'ticked', checked);
                          countNow();
                        }}
                      />
                    </td>
                    <td data-control>
                      <TextField
                        label={`${t(table.labelKey)}: ${t(table.searchKey)}`}
                        hideLabel
                        size="small"
                        width="full"
                        placeholder={t(table.searchKey)}
                        value={filter().contains}
                        disabled={!filter().ticked}
                        data-testid={`central-data-export-${id}-search`}
                        onInput={event => {
                          props.setFilters(
                            index(),
                            'contains',
                            event.currentTarget.value
                          );
                          countSoon();
                        }}
                      />
                    </td>
                    <td data-control>
                      <Show when={table.hasStatus} fallback="—">
                        <Select
                          label={`${t(table.labelKey)}: ${t('label.status')}`}
                          hideLabel
                          size="small"
                          options={statusOptions()}
                          value={filter().status}
                          disabled={!filter().ticked}
                          testId={`central-data-export-${id}-status`}
                          onValueChange={value => {
                            if (!isStatus(value)) return;
                            props.setFilters(index(), 'status', value);
                            countNow();
                          }}
                        />
                      </Show>
                    </td>
                    <td
                      data-numeric
                      data-testid={`central-data-export-${id}-rows`}
                    >
                      {rowsText(index())}
                    </td>
                  </tr>
                );
              }}
            </For>
          </tbody>
        </Table>

        <Show when={countsFailed()}>
          <Alert severity="warning" testId="central-data-export-counts-failed">
            {t('error.central-data-export-counts-failed')}
          </Alert>
        </Show>

        <Show when={overCap()}>
          <Alert severity="warning" testId="central-data-export-too-many">
            {tooManyRows(rowTotal(), counts()?.maxRows ?? 0)}
          </Alert>
        </Show>

        <HStack wrap justify="end" gap="sm">
          <Button
            variant="secondary"
            disabled={!hasFilters(props.filters)}
            data-testid="central-data-clear-filters"
            onClick={clearFilters}
          >
            {t('button.clear-filters')}
          </Button>
          <Button
            data-testid="central-data-download"
            disabled={tickedCount() === 0 || overCap()}
            loading={downloading()}
            onClick={() => void download()}
          >
            {tPlural('button.download-tables', tickedCount(), {
              count: formatNumber(tickedCount()),
            })}
          </Button>
        </HStack>
        <Show when={exportError()}>
          <Alert severity="error" testId="central-data-export-error">
            {exportError()}
          </Alert>
        </Show>
      </Stack>
    </DetailCard>
  );
};
