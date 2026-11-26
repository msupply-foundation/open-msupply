import { For, Match, Show, Switch } from 'solid-js';
import { formatNumber, t, tPlural } from '@/intl';
import { CardGrid } from '@/ui/layout/CardGrid/CardGrid';
import { DetailCard } from '@/ui/layout/Detail/DetailCard';
import { Stack } from '@/ui/layout/Stack/Stack';
import { HStack } from '@/ui/layout/Stack/HStack';
import { ContentFooter } from '@/ui/layout/ContentFooter/ContentFooter';
import { ContentFooterActions } from '@/ui/layout/ContentFooter/ContentFooterActions';
import { Text } from '@/ui/elements/typography/Text';
import { Button } from '@/ui/elements/buttons/Button';
import { Alert } from '@/ui/elements/feedback/Alert';
import { StatusBadge } from '@/ui/elements/feedback/StatusBadge';
import { DataTable, type Column } from '@/ui/elements/table/DataTable';
import { getCellDefinition } from '@/ui/elements/table/tableHelpers';
import { createLocalPagination } from '@/ui/elements/table/createLocalPagination';
import { remToPx } from '@/ui/utils/rem';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/ui/elements/accordion/Accordion';
import {
  changeBadge,
  changeCount,
  describeFields,
  previewNotice,
  tableEntry,
  type ImportOutcome,
} from './centralDataLogic';

// S1's preview card (spec/central-data/ui-surface.md § preview card). Its
// actions are ImportPreviewFooter, in the page's pinned footer.

export type Preview = {
  fileId: string;
  fileName: string;
  summary: Extract<ImportOutcome, { kind: 'summary' }>['summary'];
};

type RowChange = Preview['summary']['changes'][number];
type RowError = Preview['summary']['errors'][number];

/** Rows per page of either list. */
const PAGE_SIZE = 10;

const sheetColumn = <T extends { sheet: string }>(): Column<T, never> => ({
  c: { id: 'sheet', accessor: row => row.sheet },
  header: () => t('label.sheet'),
  size: remToPx(8),
});
// An error on a sheet name has no row.
const rowColumn = <T extends { row?: number | null }>(): Column<T, never> => ({
  c: { id: 'row', accessor: row => row.row ?? '' },
  header: () => t('label.row'),
  meta: { align: 'right' },
  size: remToPx(5),
});

const changeColumns: Column<RowChange, never>[] = [
  sheetColumn(),
  rowColumn(),
  {
    c: { key: 'change' },
    header: () => t('label.change-kind'),
    size: remToPx(8),
    cell: info => (
      <Show when={changeBadge(info.row.original.change)}>
        {badge => (
          <StatusBadge tone={badge().tone} label={t(badge().labelKey)} />
        )}
      </Show>
    ),
  },
  {
    c: { key: 'record' },
    header: () => t('label.record'),
    ...getCellDefinition('name'),
  },
  {
    c: { id: 'fields', accessor: row => describeFields(row.fields) },
    header: () => t('label.what-changes'),
    ...getCellDefinition('description', { wrapLines: 3 }),
  },
];

const errorColumns: Column<RowError, never>[] = [
  sheetColumn(),
  rowColumn(),
  {
    c: { id: 'column', accessor: row => row.column ?? '' },
    header: () => t('label.column'),
    size: remToPx(8),
  },
  {
    c: { key: 'message' },
    header: () => t('label.problem'),
    ...getCellDefinition('description', { wrapLines: 3 }),
  },
];

/** `rechecked`: the preview was run again after an Import whose reply was
 *  lost, so nothing was just uploaded. */
export const ImportPreviewCard = (props: {
  preview: Preview;
  rechecked?: boolean;
}) => {
  const errorCount = () => props.preview.summary.errorCount;
  const changes = () => changeCount(props.preview.summary);
  const notice = () => previewNotice(props.preview.summary);
  const changePage = createLocalPagination(
    () => props.preview.summary.changes,
    { pageSize: PAGE_SIZE }
  );
  const errorPage = createLocalPagination(() => props.preview.summary.errors, {
    pageSize: PAGE_SIZE,
  });
  return (
    <DetailCard
      title={props.preview.fileName}
      testId="central-data-preview"
      actions={
        <StatusBadge
          tone={errorCount() > 0 ? 'error' : 'success'}
          label={
            errorCount() > 0
              ? tPlural('error.central-data-row-errors', errorCount(), {
                  count: formatNumber(errorCount()),
                })
              : t('label.no-problems')
          }
          testId="central-data-preview-status"
        />
      }
    >
      <Stack>
        <CardGrid minColumnWidth="18rem">
          <For each={props.preview.summary.tables}>
            {row => {
              const entry = tableEntry(row.table);
              const problems = () => row.errorCount;
              return (
                <DetailCard
                  title={entry ? t(entry.labelKey) : row.table}
                  surface="bordered"
                  testId={`central-data-preview-${entry?.sheet ?? row.table}`}
                  actions={
                    <Text variant="bodySmall">
                      {problems() > 0
                        ? tPlural('label.count-problems', problems(), {
                            count: formatNumber(problems()),
                          })
                        : t('label.no-problems')}
                    </Text>
                  }
                >
                  <HStack gap="sm" wrap>
                    <StatusBadge
                      tone="info"
                      label={tPlural('label.count-new', row.inserted, {
                        count: formatNumber(row.inserted),
                      })}
                    />
                    <StatusBadge
                      label={tPlural('label.count-updated', row.updated, {
                        count: formatNumber(row.updated),
                      })}
                    />
                    <StatusBadge
                      tone="warning"
                      label={tPlural('label.count-deleted', row.deleted, {
                        count: formatNumber(row.deleted),
                      })}
                    />
                    <StatusBadge
                      appearance="outline"
                      label={tPlural('label.count-unchanged', row.unchanged, {
                        count: formatNumber(row.unchanged),
                      })}
                    />
                  </HStack>
                </DetailCard>
              );
            }}
          </For>
        </CardGrid>

        <Switch>
          <Match when={notice() === 'ready'}>
            <Accordion collapsible>
              <AccordionItem value="changed-rows">
                <AccordionTrigger>
                  {tPlural('label.review-changed-rows', changes(), {
                    count: formatNumber(changes()),
                  })}
                </AccordionTrigger>
                <AccordionContent>
                  <Stack>
                    <DataTable
                      columns={changeColumns}
                      rows={changePage.rows()}
                      rowKey={row => `${row.sheet}:${row.row}`}
                      showFullScreen={false}
                      pagination={changePage.pagination()}
                    />
                    <Show
                      when={changes() > props.preview.summary.changes.length}
                    >
                      <Text>
                        {t('messages.and-count-more', {
                          count: formatNumber(
                            changes() - props.preview.summary.changes.length
                          ),
                        })}
                      </Text>
                    </Show>
                  </Stack>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
            <Show when={!props.rechecked}>
              <Alert severity="success" testId="central-data-upload-successful">
                {t('messages.central-data-upload-successful')}
              </Alert>
            </Show>
            <Alert severity="info" testId="central-data-all-or-nothing">
              {t('messages.central-data-problem-imports-nothing')}
            </Alert>
          </Match>
          <Match when={notice() === 'nothing-to-import'}>
            <Alert severity="success" testId="central-data-nothing-to-import">
              {props.rechecked
                ? t('messages.central-data-nothing-left-to-import')
                : t('messages.central-data-nothing-to-import')}
            </Alert>
          </Match>
          <Match when={notice() === 'errors'}>
            <DataTable
              columns={errorColumns}
              rows={errorPage.rows()}
              rowKey={error =>
                `${error.sheet}:${error.row}:${error.column ?? ''}:${error.message}`
              }
              showFullScreen={false}
              pagination={errorPage.pagination()}
            />
            <Show when={errorCount() > props.preview.summary.errors.length}>
              <Text>
                {t('messages.and-count-more', {
                  count: formatNumber(
                    errorCount() - props.preview.summary.errors.length
                  ),
                })}
              </Text>
            </Show>
          </Match>
        </Switch>
      </Stack>
    </DetailCard>
  );
};

/** The preview's actions, for the page's pinned footer. */
export const ImportPreviewFooter = (props: {
  preview: Preview;
  busy: boolean;
  downloadingErrors: boolean;
  onDownloadErrors: () => void;
  onConfirm: () => void;
}) => {
  const errorCount = () => props.preview.summary.errorCount;
  const changes = () => changeCount(props.preview.summary);
  return (
    <ContentFooter testId="central-data-preview-actions">
      <Show when={errorCount() > 0}>
        <Text>{t('messages.central-data-fix-and-retry')}</Text>
      </Show>
      <ContentFooterActions>
        <Show when={errorCount() > 0}>
          <Button
            variant="secondary"
            disabled={props.busy}
            loading={props.downloadingErrors}
            data-testid="central-data-download-errors"
            onClick={() => props.onDownloadErrors()}
          >
            {t('button.download-with-errors')}
          </Button>
        </Show>
        <Button
          variant="primary"
          data-testid="central-data-confirm-import"
          disabled={previewNotice(props.preview.summary) !== 'ready'}
          loading={props.busy}
          onClick={() => props.onConfirm()}
        >
          {tPlural('button.import-changes', changes(), {
            count: formatNumber(changes()),
          })}
        </Button>
      </ContentFooterActions>
    </ContentFooter>
  );
};
