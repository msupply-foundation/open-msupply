import { createMemo, createSignal, Show, type Component } from 'solid-js';
import { t } from '@/intl';
import { generateUUID } from '@/uuid';
import { saveBlob } from '@/platform/openDocument';
import { readCsvFile } from '@/domain/reportFiles';
import { Dialog } from '@/ui/elements/feedback/Dialog';
import { CancelButton } from '@/ui/elements/buttons/StandardButtons';
import { Button } from '@/ui/elements/buttons/Button';
import { Alert } from '@/ui/elements/feedback/Alert';
import { Text } from '@/ui/elements/typography/Text';
import { Stack } from '@/ui/layout/Stack/Stack';
import { ProgressList } from '@/ui/sync/ProgressList';
import { UploadZone } from '@/ui/elements/inputs/UploadZone';
import { TextField } from '@/ui/elements/inputs/TextField';
import { DownloadIcon, ExportIcon } from '@/ui/icons';
import { DataTable, type Column } from '@/ui/elements/table/DataTable';
import {
  getCurrencyCell,
  getDateCell,
  getNumberCell,
  getTextCell,
} from '@/ui/elements/table/tableHelpers';
import { remToPx } from '@/ui/utils/rem';
import { insertPurchaseOrderLine } from '../purchaseOrderUpdate';
import {
  buildTemplateCsv,
  failedRowsToCsv,
  parseImportFile,
  rowToInsertInput,
  type ImportRow,
} from './importLines';
import {
  canImport,
  CSV_ACCEPT,
  hasErrors,
  hasWarnings,
  IMPORT_BATCH_SIZE,
  isCsvFileName,
} from '@/domain/csvImport';

// The line import (spec/purchase-orders S16): Upload → Review → Import, the
// step indicator a display rather than a control. Nothing is server-side:
// every row is checked here (importLines.ts) and each accepted row becomes one
// ordinary line insert, a hundred at a time with no transaction across them —
// so a run that partly fails returns to Review carrying exactly the rows the
// server refused, each with its reason.

type Step = 'upload' | 'review' | 'import';

export interface PurchaseOrderLineImportModalProps {
  storeId: string;
  orderId: string;
  currencyCode: string | undefined;
  onClose: () => void;
  /** Lines were created — the screen re-reads and lands on the General tab. */
  onImported: () => void;
}

export const PurchaseOrderLineImportModal: Component<
  PurchaseOrderLineImportModalProps
> = props => {
  const [step, setStep] = createSignal<Step>('upload');
  const [rows, setRows] = createSignal<ImportRow[]>([]);
  const [uploadError, setUploadError] = createSignal<string>();
  const [importError, setImportError] = createSignal<string>();
  const [importing, setImporting] = createSignal(false);
  const [done, setDone] = createSignal(0);
  const [search, setSearch] = createSignal('');

  const downloadTemplate = () =>
    saveBlob(
      new Blob([buildTemplateCsv()], { type: 'text/csv;charset=utf-8;' }),
      `${t('filename.pol')}.csv`
    );

  const onFile = async (file: File) => {
    setUploadError(undefined);
    setImportError(undefined);
    if (!isCsvFileName(file.name))
      return setUploadError(t('messages.invalid-file'));
    try {
      const parsed = parseImportFile(await readCsvFile(file), generateUUID);
      if (!Array.isArray(parsed))
        return setUploadError(
          parsed === 'no-rows'
            ? t('error.import-no-rows')
            : t('error.import-columns-not-recognised')
        );
      setRows(parsed);
      setStep('review');
    } catch (error) {
      setUploadError(String(error));
    }
  };

  const runImport = async () => {
    setImporting(true);
    setImportError(undefined);
    setDone(0);
    setStep('import');
    const storeId = props.storeId;
    const orderId = props.orderId;
    const attempted = rows();
    const failures: ImportRow[] = [];
    for (let at = 0; at < attempted.length; at += IMPORT_BATCH_SIZE) {
      const batch = attempted.slice(at, at + IMPORT_BATCH_SIZE);
      const settled = await Promise.all(
        batch.map(async row => {
          const result = await insertPurchaseOrderLine(
            storeId,
            rowToInsertInput(row, orderId)
          );
          if (result.kind === 'saved') return null;
          return {
            ...row,
            errors: [
              t('error.import-failed', {
                error:
                  result.kind === 'error'
                    ? result.message
                    : t('messages.unknown-error'),
              }),
            ],
          };
        })
      );
      settled.forEach(failed => failed && failures.push(failed));
      setDone(Math.min(at + batch.length, attempted.length));
    }
    setImporting(false);
    props.onImported();
    if (failures.length === 0) {
      props.onClose();
      return;
    }
    setImportError(t('messages.import-error-purchase-order-lines'));
    setRows(failures);
    setStep('review');
  };

  const exportFailed = () =>
    saveBlob(
      new Blob([failedRowsToCsv(rows())], { type: 'text/csv;charset=utf-8;' }),
      `${t('filename.purchase-order-line-failed-uploads')}.csv`
    );

  const steps = () => {
    const current = step();
    return [
      {
        label: t('label.upload'),
        started: true,
        finished: current !== 'upload',
      },
      {
        label: t('label.review'),
        started: current !== 'upload',
        finished: current === 'import',
      },
      {
        label: t('label.import'),
        started: current === 'import',
        finished: current === 'import' && !importing(),
      },
    ];
  };

  const visibleRows = createMemo(() => {
    const needle = search().trim().toLowerCase();
    if (!needle) return rows();
    return rows().filter(row =>
      [row.itemCode, row.supplierItemCode, row.comment, row.note]
        .join(' ')
        .toLowerCase()
        .includes(needle)
    );
  });

  const columns = (): Column<ImportRow, string>[] => [
    {
      c: { key: 'itemCode' },
      header: () => t('label.code'),
      ...getTextCell(),
      size: remToPx(7),
    },
    {
      c: { key: 'requestedPackSize' },
      header: () => t('label.pack-size'),
      ...getNumberCell(),
      size: remToPx(6),
    },
    {
      c: { key: 'packs' },
      header: () => t('label.requested-packs'),
      ...getNumberCell(),
      size: remToPx(7),
    },
    {
      c: { key: 'supplierItemCode' },
      header: () => t('label.supplier-item-code'),
      ...getTextCell(),
      size: remToPx(8),
    },
    {
      c: { key: 'pricePerPackBeforeDiscount' },
      header: () => t('label.price-per-pack-before-discount'),
      ...getCurrencyCell(undefined, () => props.currencyCode),
      size: remToPx(8),
    },
    {
      c: { key: 'discountPercentage' },
      header: () => t('label.discount-percentage'),
      ...getNumberCell(),
      size: remToPx(6),
    },
    {
      c: { key: 'pricePerPackAfterDiscount' },
      header: () => t('label.price-per-pack-after-discount'),
      ...getCurrencyCell(undefined, () => props.currencyCode),
      size: remToPx(8),
    },
    {
      c: { key: 'requestedDeliveryDate' },
      header: () => t('label.requested-delivery-date'),
      ...getDateCell(),
      size: remToPx(9),
    },
    {
      c: { key: 'expectedDeliveryDate' },
      header: () => t('label.expected-delivery-date'),
      ...getDateCell(),
      size: remToPx(9),
    },
    {
      c: { key: 'comment' },
      header: () => t('label.comment'),
      ...getTextCell(),
      size: remToPx(9),
    },
    {
      c: { key: 'note' },
      header: () => t('label.notes'),
      ...getTextCell(),
      size: remToPx(9),
    },
    ...(hasWarnings(rows())
      ? [
          {
            c: {
              accessor: row => row.warnings.join(' '),
              id: 'warningMessage',
            },
            header: () => t('label.warning-message'),
            ...getTextCell<ImportRow>(),
            size: remToPx(14),
          } as Column<ImportRow, string>,
        ]
      : []),
    ...(hasErrors(rows())
      ? [
          {
            c: { accessor: row => row.errors.join(' '), id: 'errorMessage' },
            header: () => t('label.error-message'),
            ...getTextCell<ImportRow>(),
            size: remToPx(14),
          } as Column<ImportRow, string>,
        ]
      : []),
  ];

  return (
    <Dialog
      open
      onClose={props.onClose}
      title={t('label.import-purchase-order-lines')}
      width="wide"
      testId="purchase-order-line-import-modal"
      dismissable={!importing()}
      actions={
        <>
          <CancelButton
            onClick={props.onClose}
            disabled={importing()}
            data-testid="dialog-button-cancel"
          />
          <Button
            variant="secondary"
            icon={<ExportIcon />}
            disabled={!hasErrors(rows()) || importing()}
            onClick={() => void exportFailed()}
            data-testid="dialog-button-export"
          >
            {t('button.export')}
          </Button>
          <Button
            variant="primary"
            confirms="plain"
            loading={importing()}
            disabled={!canImport(rows()) || importing()}
            onClick={() => void runImport()}
            data-testid="dialog-button-ok"
          >
            {t('button.import')}
          </Button>
        </>
      }
    >
      <Stack>
        <ProgressList steps={steps()} error={!!importError()} />

        <Show when={uploadError()}>
          {message => (
            <Alert severity="error" testId="import-upload-error">
              {message()}
            </Alert>
          )}
        </Show>
        <Show when={importError()}>
          {message => (
            <Alert severity="error" testId="import-outcome">
              {message()}
            </Alert>
          )}
        </Show>
        <Show when={!importError() && rows().length > 0 && hasErrors(rows())}>
          <Alert severity="error" testId="import-review-error">
            {t('messages.import-error-on-upload')}
          </Alert>
        </Show>
        <Show
          when={
            !importError() &&
            rows().length > 0 &&
            !hasErrors(rows()) &&
            hasWarnings(rows())
          }
        >
          <Alert severity="warning">
            {t('messages.import-warning-on-upload')}
          </Alert>
        </Show>

        <Show when={step() === 'upload'}>
          <Stack>
            <UploadZone
              accept={CSV_ACCEPT}
              multiple={false}
              inputTestId="import-file-input"
              onFiles={files => files[0] && void onFile(files[0])}
              onRejected={() => setUploadError(t('messages.invalid-file'))}
            />
            <Text>
              {t('messages.template-download-text')}
              <Button
                variant="ghost"
                icon={<DownloadIcon />}
                data-testid="download-template-button"
                onClick={() => void downloadTemplate()}
              >
                {t('heading.download-example')}
              </Button>
            </Text>
          </Stack>
        </Show>

        <Show when={step() !== 'upload'}>
          <Show when={step() === 'import'}>
            <Text>
              {t('messages.import-generic', { count: done() })} ({done()}/
              {rows().length})
            </Text>
          </Show>
          <DataTable
            columns={columns()}
            rows={visibleRows()}
            rowKey={row => row.id}
            rowTone={row => (row.errors.length > 0 ? 'error' : undefined)}
            filters={
              <TextField
                label={t('label.search')}
                width="short"
                data-testid="import-review-search"
                value={search()}
                onInput={e => setSearch(e.currentTarget.value)}
              />
            }
            emptyMessage={t('error.no-items-to-display')}
          />
        </Show>
      </Stack>
    </Dialog>
  );
};
