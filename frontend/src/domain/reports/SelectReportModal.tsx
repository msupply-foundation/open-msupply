import { createResource, createSignal, Show, type Component } from 'solid-js';
import { t } from '../../intl';
import { Dialog } from '../../ui/elements/feedback/Dialog';
import { Alert } from '../../ui/elements/feedback/Alert';
import { Button } from '../../ui/elements/buttons/Button';
import { Combobox } from '../../ui/elements/selectors/Combobox';
import { Spinner } from '../../ui/elements/feedback/Spinner';
import { DownloadIcon, PrinterIcon, XCircleIcon } from '../../ui/icons';
import {
  fetchReportFile,
  printHtml,
  type GenerateResult,
} from '../reportFiles';
import { isAndroid } from '../../platform';
import { openBlob, saveBlob } from '../../platform/openDocument';
import { ArgumentsModal } from '../json-forms/ArgumentsModal';
import { timezoneArgument } from '../json-forms/schema';
import { listReportsByContext, type Report } from './reportsResource';
import type { ReportContext } from './reportsResource';
import {
  generateReport,
  type PrintFormat,
  type ReportSort,
} from './generateReport';
import { reportLabel } from './reportLabel';

// S4 — the record-screen report selector (spec/reports S4). The reports
// vertical OWNS this dialog; host verticals (stocktakes, …) only render the
// trigger and pass their context + record id + current sort (spec: "their
// surfaces name the trigger, this vertical owns the dialog").
//
// Flow: list the context's reports → the user picks one and a format (Export to
// Excel / Print / Download PDF, all disabled until a report is selected) → if
// the report declares an argument schema, S3 (ArgumentsModal) collects filters
// first → generate → fetch the file handle → print (HTML, hidden-iframe
// window.print, desktop) or download (Excel/PDF). Errors show INLINE in the
// dialog body (spec/reports S5 — never a toast).
//
// The trigger button lives with the host vertical; this component is the dialog
// body + its own phase state, mounted only while open (like the action modals,
// kdd/action-modal) so each open starts fresh.

export interface SelectReportModalProps {
  context: ReportContext;
  /** The record the reports render against (e.g. the stocktake id). */
  dataId: string;
  /** The host table's current sort, passed through to generation. */
  sort?: ReportSort;
  onClose: () => void;
}

export const SelectReportModal: Component<SelectReportModalProps> = props => {
  // The context's reports, fetched once when the dialog opens (the component is
  // mounted only while open). Read non-suspending via `.latest` so the dialog
  // shows its own spinner rather than tripping an outer Suspense boundary
  // (kdd/solid-reactivity-pitfalls).
  const [reports] = createResource(
    () => props.context,
    context => listReportsByContext(context)
  );
  const options = () => reports.latest ?? [];

  const [selected, setSelected] = createSignal<Report | null>(null);
  // 'idle' → the pick/format row; 'generating' → blocking spinner + disabled
  // actions; 'error' → an inline banner, actions re-enabled to retry.
  const [phase, setPhase] = createSignal<'idle' | 'generating' | 'error'>(
    'idle'
  );
  // When the picked report has an argument schema, we hold the chosen format
  // while the ArgumentsModal (S3) collects filters, then resume generation.
  const [pendingFormat, setPendingFormat] = createSignal<PrintFormat | null>(
    null
  );

  // Deliver a generated file: fetch the handle, then print (HTML) or download
  // (Excel/PDF). fetchReportFile never throws — an error resolves to the inline
  // banner (spec/reports S5). A dataError from generation likewise surfaces
  // inline; a `failed` result means the global modal already showed the fault,
  // so we just drop back to idle.
  // The chosen format carries the user's INTENT (HTML = print/view, Excel and
  // PDF = keep) — delivery forks on it. Await the platform delivery: a failure
  // keeps the dialog up with the inline error rather than closing as if it
  // worked.
  const deliver = async (
    result: GenerateResult,
    chosen: PrintFormat
  ): Promise<void> => {
    if (result.kind === 'dataError') {
      setPhase('error');
      return;
    }
    if (result.kind === 'failed') {
      setPhase('idle');
      return;
    }
    const file = await fetchReportFile(result.fileId);
    if (file.kind !== 'success') {
      setPhase('error');
      return;
    }
    if (chosen === 'HTML') {
      // Print. Android has no window.print — the generated file is a PDF
      // (see runGenerate), viewed via the OS where printing lives.
      if (isAndroid()) {
        const delivered = await openBlob(file.blob, file.filename);
        if (!delivered.ok) {
          setPhase('error');
          return;
        }
      } else {
        printHtml(await file.blob.text());
      }
    } else {
      // Export/download: the user picks the destination (browser download on
      // web, the OS save picker on Android).
      const delivered = await saveBlob(file.blob, file.filename);
      if (!delivered.ok) {
        setPhase('error');
        return;
      }
    }
    props.onClose();
  };

  const runGenerate = async (
    chosen: PrintFormat,
    args?: Record<string, unknown>
  ): Promise<void> => {
    const report = selected();
    if (!report) return;
    setPhase('generating');
    // Print on Android generates a PDF instead of HTML (no window.print in
    // the WebView — spec/android § Files out of the app); `chosen` still
    // travels to deliver() so the print INTENT survives the substitution.
    const format = isAndroid() && chosen === 'HTML' ? 'PDF' : chosen;
    // The user's timezone travels even when the report has no argument form —
    // shipped templates read `arguments.timezone` unconditionally, and the
    // captured client sends `{ timezone }` alone on this path (AC-R11). Form
    // args, when present, already contain it and win on key collision.
    const result = await generateReport({
      reportId: report.id,
      dataId: props.dataId,
      format,
      args: { ...timezoneArgument(), ...args },
      sort: props.sort,
    });
    await deliver(result, chosen);
  };

  // A format button: if the report declares filters, open S3 first (holding the
  // format); otherwise generate straight away.
  const onFormat = (format: PrintFormat): void => {
    const report = selected();
    if (!report) return;
    if (report.argumentSchema) {
      setPendingFormat(format);
      return;
    }
    void runGenerate(format);
  };

  const busy = () => phase() === 'generating';
  const disabled = () => !selected() || busy();

  return (
    <>
      <Dialog
        open
        // Blocking while generating — no scrim/Escape exit mid-flight.
        dismissable={!busy()}
        onClose={props.onClose}
        icon={<PrinterIcon />}
        title={t('title.select-a-form')}
        widthRem={40}
        actions={
          <>
            <Button
              variant="secondary"
              icon={<XCircleIcon />}
              disabled={busy()}
              onClick={props.onClose}
            >
              {t('button.cancel')}
            </Button>
            <Button
              variant="secondary"
              icon={<DownloadIcon />}
              disabled={disabled()}
              onClick={() => onFormat('EXCEL')}
            >
              {t('button.export-to-excel')}
            </Button>
            <Button
              variant="secondary"
              icon={<PrinterIcon />}
              disabled={disabled()}
              onClick={() => onFormat('HTML')}
            >
              {t('button.print')}
            </Button>
            <Button
              variant="secondary"
              icon={<DownloadIcon />}
              disabled={disabled()}
              onClick={() => onFormat('PDF')}
            >
              {t('button.download-pdf')}
            </Button>
          </>
        }
      >
        <Show when={!reports.loading} fallback={<Spinner center />}>
          <Show
            when={options().length > 0}
            fallback={<div>{t('error.no-forms-available')}</div>}
          >
            <Combobox
              label={t('title.select-a-form')}
              hideLabel
              items={options()}
              itemToString={reportLabel}
              itemToValue={report => report.id}
              value={selected()?.id}
              onChange={report => setSelected(report)}
              disabled={busy()}
            />
          </Show>
          <Show when={phase() === 'error'}>
            <Alert severity="error">
              {t('messages.error-printing-report')}
            </Alert>
          </Show>
          <Show when={busy()}>
            <Spinner center />
          </Show>
        </Show>
      </Dialog>

      {/* S3 — argument entry, when the picked report declares filters. Opens
          over this dialog; OK resumes generation with the entered args, Cancel
          drops the pending format and returns to the pick row. */}
      <ArgumentsModal
        report={selected() ?? { argumentSchema: null }}
        open={pendingFormat() !== null}
        onClose={() => setPendingFormat(null)}
        onSubmit={args => {
          const format = pendingFormat();
          setPendingFormat(null);
          if (format) void runGenerate(format, args);
        }}
      />
    </>
  );
};
