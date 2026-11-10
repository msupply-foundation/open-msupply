import {
  createMemo,
  createResource,
  createSignal,
  Show,
  type Component,
} from 'solid-js';
import { graphqlFetch } from '@/api/graphql';
import { gated } from '@/api/gated';
import { t } from '@/intl';
import { Alert } from '@/ui/elements/feedback/Alert';
import { ConfirmDialog } from '@/ui/elements/feedback/ConfirmDialog';
import { Button } from '@/ui/elements/buttons/Button';
import { Text } from '@/ui/elements/typography/Text';
import { Stack } from '@/ui/layout/Stack/Stack';
import { HStack } from '@/ui/layout/Stack/HStack';
import { UploadZone } from '@/ui/elements/inputs/UploadZone';
import { DownloadIcon } from '@/ui/icons';
import { DataTable, type Column } from '@/ui/elements/table/DataTable';
import { getNumberCell, getTextCell } from '@/ui/elements/table/tableHelpers';
import { remToPx } from '@/ui/utils/rem';
import { saveBlob } from '@/platform/openDocument';
import { readCsvFile } from '@/domain/reportFiles';
import { CSV_ACCEPT, isCsvFileName } from '@/domain/csvImport';
import {
  ClearConsumptionEstimates,
  ConsumptionEstimateTemplateItems,
  ConsumptionEstimates,
  ReplaceConsumptionEstimates,
} from './consumptionEstimates.generated';
import {
  applyServerResult,
  buildLines,
  buildTemplateCsv,
  parseEstimateFile,
  pivotEstimates,
  type EstimateImportRow,
  type EstimateTableRow,
  type Month,
} from './consumptionEstimateImport';

/*
 * The store editor's Consumption estimates tab (spec/settings/rules.md § The
 * store editor › Consumption estimates): estimated monthly consumption for a
 * store with no history of its own, which AMC adds on top of real consumption
 * until it's older than the look-back period.
 *
 * Unlike the other tabs it is NOT part of the editor's draft: an upload is
 * checked by the server (a dry run), reviewed, and then replaces the estimates
 * of the items in the file by its own Save — the editor's Save and Cancel
 * don't touch it. Items not in the file keep theirs.
 *
 * Reactivity: the read first fetches when the tab opens, under the editor's
 * already-open dialog, so it goes through the `.state` gate and never suspends
 * (kdd/solid-reactivity-pitfalls § no remounts on interaction).
 */
export const ConsumptionEstimatesPanel: Component<{
  /** The signed-in store: the request's authorisation subject. */
  storeId: string;
  /** The store being edited, whose estimates these are. */
  forStoreId: string;
  /** Central server with the central-data permission. */
  editable: boolean;
}> = props => {
  const [review, setReview] = createSignal<{
    months: Month[];
    rows: EstimateImportRow[];
    lines: ReturnType<typeof buildLines>;
    /** The codes of the rows with every month blank. */
    clearedItems: string[];
  }>();
  const [uploadError, setUploadError] = createSignal<string>();
  const [saving, setSaving] = createSignal(false);
  const [saveFailed, setSaveFailed] = createSignal(false);
  const [checking, setChecking] = createSignal(false);
  const [clearing, setClearing] = createSignal(false);
  const [confirmClear, setConfirmClear] = createSignal(false);
  const [downloading, setDownloading] = createSignal(false);

  const [data, { refetch }] = createResource(
    () =>
      props.forStoreId
        ? { storeId: props.storeId, forStoreId: props.forStoreId }
        : undefined,
    async ({ storeId, forStoreId }) => {
      const result = await graphqlFetch(
        ConsumptionEstimates,
        { storeId, forStoreId },
        { background: true }
      );
      // null, not undefined, for a failed read: "couldn't load" must not
      // read as "no estimates"
      return result.kind === 'success'
        ? result.data.consumptionEstimates
        : null;
    }
  );
  const current = () => gated(data) ?? undefined;
  const loadFailed = () => gated(data) === null;
  const table = createMemo(() => pivotEstimates(current()?.estimates ?? []));

  // Only offered once the estimates have loaded: a template built before
  // then would leave out the months and values the store already has. The
  // item rows are fetched here, not with the estimates: there can be
  // thousands, and only a download needs them.
  const downloadTemplate = async () => {
    const loaded = current();
    if (!loaded) return;
    setDownloading(true);
    const items = await graphqlFetch(
      ConsumptionEstimateTemplateItems,
      { storeId: props.storeId, forStoreId: props.forStoreId },
      { background: true }
    );
    setDownloading(false);
    if (items.kind !== 'success') {
      setUploadError(
        t('error.problem-downloading-consumption-estimates-template')
      );
      return;
    }
    const csv = buildTemplateCsv(
      loaded.amcLookBackMonths,
      items.data.consumptionEstimates.templateItems,
      loaded.estimates,
      new Date()
    );
    await saveBlob(
      new Blob([csv], { type: 'text/csv;charset=utf-8;' }),
      `${t('label.consumption-estimates')}.csv`
    );
  };

  const replace = (
    lines: ReturnType<typeof buildLines>['lines'],
    clearedItems: string[],
    dryRun: boolean
  ) =>
    graphqlFetch(
      ReplaceConsumptionEstimates,
      {
        storeId: props.storeId,
        input: { forStoreId: props.forStoreId, lines, clearedItems, dryRun },
      },
      { background: true, returnGraphqlErrors: true }
    );

  // Each upload's number: only the latest one's check may show its review,
  // so a slow check of an earlier file can't replace a later file's
  let latestUpload = 0;

  const onFile = async (file: File) => {
    const upload = ++latestUpload;
    setUploadError(undefined);
    setSaveFailed(false);
    if (!isCsvFileName(file.name))
      return setUploadError(t('messages.invalid-file'));
    setChecking(true);
    try {
      await checkFile(file, upload);
    } finally {
      if (upload === latestUpload) setChecking(false);
    }
  };

  const checkFile = async (file: File, upload: number) => {
    try {
      // NOT file.text(): a spreadsheet saved on Windows uses the machine's
      // legacy code page (domain/reportFiles § readCsvFile).
      const parsed = parseEstimateFile(await readCsvFile(file), new Date());
      if (upload !== latestUpload) return;
      if (parsed.kind === 'failed') {
        return setUploadError(
          {
            'no-header': t('error.import-columns-not-recognised'),
            'no-month-columns': t(
              'error.consumption-estimate-no-month-columns'
            ),
            'no-rows': t('error.import-no-rows'),
          }[parsed.reason]
        );
      }
      // The server checks the rows that passed our own checks, so every
      // problem in the file shows at once. Nothing can be saved while any row
      // has an error, so these are also the lines a save sends. It also says
      // which blank rows' items have estimates to remove.
      const lines = buildLines(
        parsed.rows.filter(row => row.errors.length === 0)
      );
      const clearedItems = parsed.blankRows.map(row => row.itemCode);
      let rows = parsed.rows;
      if (lines.lines.length > 0 || clearedItems.length > 0) {
        const result = await replace(lines.lines, clearedItems, true);
        if (upload !== latestUpload) return;
        if (result.kind !== 'success') {
          return setUploadError(
            t('messages.upload-error', { error: t('error.problem-saving') })
          );
        }
        rows = applyServerResult(
          rows,
          lines.origins,
          parsed.blankRows,
          result.data.centralServer.preferences.replaceConsumptionEstimates
        );
      }
      setReview({ months: parsed.months, rows, lines, clearedItems });
    } catch (error) {
      if (upload !== latestUpload) return;
      setUploadError(t('messages.upload-error', { error: String(error) }));
    }
  };

  const save = async (
    lines: ReturnType<typeof buildLines>['lines'],
    clearedItems: string[]
  ) => {
    setSaving(true);
    setSaveFailed(false);
    const result = await replace(lines, clearedItems, false);
    setSaving(false);
    if (
      result.kind !== 'success' ||
      result.data.centralServer.preferences.replaceConsumptionEstimates
        .__typename !== 'ReplaceConsumptionEstimatesNode'
    ) {
      setSaveFailed(true);
      return;
    }
    setReview(undefined);
    void refetch();
  };

  const clear = async () => {
    if (clearing()) return;
    setClearing(true);
    setSaveFailed(false);
    const result = await graphqlFetch(
      ClearConsumptionEstimates,
      { storeId: props.storeId, forStoreId: props.forStoreId },
      { background: true, returnGraphqlErrors: true }
    );
    setClearing(false);
    if (result.kind !== 'success') {
      setSaveFailed(true);
      return;
    }
    void refetch();
  };

  const reviewHasErrors = () =>
    review()?.rows.some(row => row.errors.length > 0) ?? false;

  const itemColumns = <T extends { code?: string; itemCode?: string }>(
    code: (row: T) => string,
    name: (row: T) => string
  ): Column<T, never>[] => [
    {
      c: { accessor: code, id: 'code' },
      header: () => t('label.code'),
      ...getTextCell(),
      size: remToPx(7),
    },
    {
      c: { accessor: name, id: 'name' },
      header: () => t('label.name'),
      ...getTextCell({ wrapLines: 2 }),
      size: remToPx(14),
    },
  ];

  const currentColumns = (): Column<EstimateTableRow, never>[] => [
    ...itemColumns<EstimateTableRow>(
      row => row.code,
      row => row.name
    ),
    ...table().months.map((month): Column<EstimateTableRow, never> => ({
      c: { accessor: row => row.quantities[month], id: `month-${month}` },
      header: () => month,
      ...getNumberCell(),
      size: remToPx(7),
    })),
  ];

  const reviewColumns = (): Column<EstimateImportRow, never>[] => [
    {
      c: { accessor: row => row.lineNumber, id: 'line' },
      header: () => t('label.line-number'),
      ...getNumberCell(),
      size: remToPx(4),
    },
    ...itemColumns<EstimateImportRow>(
      row => row.itemCode,
      row => row.itemName
    ),
    // Before the months and wrapped, not after them and cut off: there's a
    // column per month of the look-back, so the end of the row can be well
    // past the dialog's edge, and the reason a row is highlighted has to be
    // readable without scrolling sideways
    {
      c: {
        accessor: row => [...row.errors, ...row.warnings].join(' '),
        id: 'message',
      },
      header: () => t('label.error-message'),
      ...getTextCell({ wrapLines: 4 }),
      size: remToPx(18),
    },
    ...(review()?.months ?? []).map(
      (month): Column<EstimateImportRow, never> => ({
        c: { accessor: row => row.cells[month] ?? '', id: `month-${month}` },
        header: () => month,
        ...getTextCell(),
        size: remToPx(6),
      })
    ),
  ];

  return (
    <Stack data-testid="consumption-estimates">
      <Text>{t('messages.consumption-estimates-description')}</Text>

      {/* Estimates sync over v7 only: say so rather than let them silently
          never arrive */}
      <Show when={current()?.siteSyncsOverV5V6}>
        <Alert severity="warning" testId="consumption-estimates-v5-v6-site">
          {t('messages.consumption-estimates-v5-v6-site')}
        </Alert>
      </Show>

      <Show when={uploadError()}>
        {message => (
          <Alert severity="error" testId="consumption-estimates-upload-error">
            {message()}
          </Alert>
        )}
      </Show>
      <Show when={loadFailed()}>
        <Alert severity="error" testId="consumption-estimates-load-error">
          {t('error.problem-loading-consumption-estimates')}
        </Alert>
      </Show>
      <Show when={saveFailed()}>
        <Alert severity="error" testId="consumption-estimates-save-error">
          {t('error.problem-saving')}
        </Alert>
      </Show>

      <Show
        when={review()}
        fallback={
          <>
            <Show when={props.editable && current()}>
              <HStack gap="sm" justify="end">
                <Button
                  variant="secondary"
                  icon={<DownloadIcon />}
                  loading={downloading()}
                  data-testid="consumption-estimates-download-template"
                  onClick={() => void downloadTemplate()}
                >
                  {t('button.download-consumption-estimates-template')}
                </Button>
                <Show when={(current()?.estimates.length ?? 0) > 0}>
                  <Button
                    variant="secondary"
                    loading={clearing()}
                    disabled={checking()}
                    data-testid="consumption-estimates-clear"
                    onClick={() => setConfirmClear(true)}
                  >
                    {t('button.clear-consumption-estimates')}
                  </Button>
                </Show>
              </HStack>
              <UploadZone
                accept={CSV_ACCEPT}
                multiple={false}
                disabled={checking() || clearing()}
                onFiles={files => {
                  const file = files[0];
                  if (file) void onFile(file);
                }}
                onRejected={() => setUploadError(t('messages.invalid-file'))}
              />
            </Show>
            <DataTable
              columns={currentColumns()}
              rows={table().rows}
              rowKey={row => row.itemId}
              loading={data.loading || checking()}
              emptyMessage={t('messages.no-consumption-estimates')}
              minBodyRem={12}
            />
          </>
        }
      >
        {pending => (
          <>
            <Show
              when={reviewHasErrors()}
              fallback={
                <Show when={pending().rows.some(row => row.warnings.length)}>
                  <Alert
                    severity="warning"
                    testId="consumption-estimates-review-warning"
                  >
                    {t('messages.consumption-estimates-review-warning')}
                  </Alert>
                </Show>
              }
            >
              <Alert
                severity="warning"
                testId="consumption-estimates-review-error"
              >
                {t('messages.import-error-on-upload')}
              </Alert>
            </Show>
            <DataTable
              columns={reviewColumns()}
              rows={pending().rows}
              rowKey={row => String(row.lineNumber)}
              loading={saving()}
              rowTone={row =>
                row.errors.length > 0
                  ? 'error'
                  : row.warnings.length > 0
                    ? 'warning'
                    : undefined
              }
              emptyMessage={t('error.no-data')}
              minBodyRem={12}
            />
            <HStack gap="sm" justify="end">
              <Button
                variant="secondary"
                disabled={saving()}
                data-testid="consumption-estimates-cancel"
                onClick={() => setReview(undefined)}
              >
                {t('button.cancel')}
              </Button>
              <Button
                variant="primary"
                loading={saving()}
                disabled={reviewHasErrors() || saving()}
                data-testid="consumption-estimates-save"
                onClick={() =>
                  void save(pending().lines.lines, pending().clearedItems)
                }
              >
                {t('button.replace-consumption-estimates')}
              </Button>
            </HStack>
          </>
        )}
      </Show>

      <ConfirmDialog
        open={confirmClear()}
        onClose={() => setConfirmClear(false)}
        message={t('messages.confirm-clear-consumption-estimates')}
        confirmLabel={t('button.clear-consumption-estimates')}
        confirmVariant="danger"
        onConfirm={() => void clear()}
      />
    </Stack>
  );
};
