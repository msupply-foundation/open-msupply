import { createSignal, Show, type Component } from 'solid-js';
import { t } from '../../intl';
import {
  SplitButton,
  type SplitButtonOption,
} from '../../ui/elements/buttons/SplitButton';
import { Button } from '../../ui/elements/buttons/Button';
import { Dialog } from '../../ui/elements/feedback/Dialog';
import { Alert } from '../../ui/elements/feedback/Alert';
import { ErrorDetails } from '../../ui/elements/feedback/ErrorDetails';
import { AlertCircleIcon, CheckIcon, DownloadIcon } from '../../ui/icons';
import { createFlash } from '../../ui/utils/createFlash';
import { saveBlob } from '../../platform/openDocument';
import { storeCodeOf } from '../../auth/authContext';
import { csvToExcel } from './csvToExcel';
import { fetchReportFile } from './files';
import {
  listExportCsvFilename,
  listExportExcelFilename,
} from './exportFilenames';

/*
 * The shared list Export action (spec/ui-standards/list-views § regions): the
 * CSV / Excel split button every list screen mounts in its header. One control
 * for all of them, so the delivery path and — the reason this exists — the
 * OUTCOME REPORT live in one place instead of eleven. The caller supplies only
 * what differs: the query that builds the CSV, and the list's name for the
 * filename.
 *
 * Outcome reporting follows controls.md § action feedback (never a toast):
 *
 *  - in flight, the button is a spinner and the whole control is inert;
 *  - success flashes "Exported" on the button for a moment, then reverts —
 *    the saved file is the real confirmation;
 *  - failure flashes "Export failed" AND opens a dialog carrying the message,
 *    with the raw error behind an <ErrorDetails> disclosure.
 *
 * That dialog is the point. Every one of these actions previously discarded
 * `saveBlob`'s result (`void saveBlob(...)`), so an Android shell missing the
 * SaveFile plugin — the legacy APK's shell registers only NativeApi, see
 * kdd/android/legacy-shell-triage.md — produced a dead click with nothing to
 * diagnose from, on the device or in a release build's suppressed console.
 *
 * Two failures stay silent by design: a cancelled save picker is the user
 * declining, not a failure; and a `failed` conversion has already reached the
 * global error modal through graphqlFetch, so reporting it again would double
 * up.
 */

export interface ListExportActionProps {
  storeId: string;
  /**
   * Builds the CSV for EVERY record matching the list's current filter (all
   * pages, not the page on screen). `null` means there is nothing to export —
   * the action reverts silently rather than saving an empty file.
   */
  buildCsv: () => Promise<string | null>;
  /**
   * The list's localised name, used in the filename (e.g.
   * `t('filename.stocktakes')`).
   */
  listName: string;
}

type Feedback = 'done' | 'failed';

export const ListExportAction: Component<ListExportActionProps> = props => {
  const [busy, setBusy] = createSignal(false);
  const feedback = createFlash<Feedback>();
  // The failure detail behind the dialog: undefined = closed. Held separately
  // from `feedback` so the flash can revert on its timer while the dialog
  // stays open until the user closes it.
  const [errorDetail, setErrorDetail] = createSignal<string>();

  const flash = feedback.show;
  const fail = (detail: string) => {
    flash('failed');
    setErrorDetail(detail);
  };

  // An accessor read in JSX, so the labels re-translate on a language switch.
  const options = (): SplitButtonOption[] => [
    { value: 'csv', label: t('button.export-csv') },
    { value: 'excel', label: t('button.export-excel') },
  ];

  // Hand the blob to the platform (browser download / Android save picker) and
  // report what came back. A declined picker reverts with no flash at all.
  const deliver = async (blob: Blob, filename: string): Promise<void> => {
    const delivered = await saveBlob(blob, filename);
    if (!delivered.ok) return fail(delivered.message);
    if (delivered.saved) flash('done');
  };

  const run = async (format: string): Promise<void> => {
    if (busy()) return; // re-entry guard
    setBusy(true);
    try {
      const csv = await props.buildCsv();
      if (!csv) return; // nothing to export
      // Filenames per the shared list-export rule
      // (ui-standards/list-views § regions).
      const storeCode = storeCodeOf(props.storeId);
      if (format === 'excel') {
        const generated = await csvToExcel({
          storeId: props.storeId,
          csvData: csv,
          filename: listExportExcelFilename(storeCode, props.listName),
          sheetName: storeCode,
        });
        // `failed` already reached the global error modal via graphqlFetch;
        // `dataError` carries the server's own JSON and reached nothing.
        if (generated.kind === 'failed') return;
        if (generated.kind === 'dataError') {
          return fail(JSON.stringify(generated.errors, null, 2));
        }
        const file = await fetchReportFile(generated.fileId);
        if (file.kind !== 'success') {
          return fail(t('error.failed-to-generate-report'));
        }
        await deliver(file.blob, file.filename);
      } else {
        await deliver(
          new Blob([csv], { type: 'text/csv;charset=utf-8;' }),
          listExportCsvFilename(storeCode, props.listName, new Date())
        );
      }
    } finally {
      setBusy(false);
    }
  };

  const mainLabel = () =>
    feedback.value() === 'done'
      ? t('message.export-success')
      : feedback.value() === 'failed'
        ? t('message.export-failed')
        : undefined;

  const icon = () =>
    feedback.value() === 'done' ? (
      <CheckIcon />
    ) : feedback.value() === 'failed' ? (
      <AlertCircleIcon />
    ) : (
      <DownloadIcon />
    );

  return (
    <>
      <SplitButton
        icon={icon()}
        options={options()}
        testId="export-csv"
        menuLabel={t('button.export')}
        loading={busy()}
        mainLabel={mainLabel()}
        onAction={format => void run(format)}
      />
      <Show when={errorDetail()}>
        {detail => (
          <Dialog
            open
            onClose={() => setErrorDetail(undefined)}
            icon={<AlertCircleIcon />}
            testId="export-error-modal"
            title={t('message.export-failed')}
            description={
              <Alert severity="error">
                {t('messages.cannot-save-file')}
                <ErrorDetails detail={detail()} />
              </Alert>
            }
            actions={
              <Button
                variant="secondary"
                data-testid="export-error-modal-close"
                onClick={() => setErrorDetail(undefined)}
              >
                {t('button.close')}
              </Button>
            }
          />
        )}
      </Show>
    </>
  );
};
