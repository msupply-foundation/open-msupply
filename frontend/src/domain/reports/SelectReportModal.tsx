import { createResource, createSignal, Show, type Component } from 'solid-js';
import { t } from '../../intl';
import { Dialog } from '../../ui/elements/feedback/Dialog';
import { createFocusTarget } from '../../ui/utils/createFocusTarget';
import { Alert } from '../../ui/elements/feedback/Alert';
import { Button } from '../../ui/elements/buttons/Button';
import { Combobox } from '../../ui/elements/selectors/Combobox';
import { Spinner } from '../../ui/elements/feedback/Spinner';
import { DownloadIcon, PrinterIcon, XCircleIcon } from '../../ui/icons';
import { fetchReportFile, type GenerateResult } from '../reportFiles';
import { isAndroid } from '../../platform';
import { printBlob, saveBlob } from '../../platform/openDocument';
import { ArgumentsModal } from '../json-forms/ArgumentsModal';
import { timezoneArgument } from '../json-forms/schema';
import { listReportsByContext, type Report } from './reportsResource';
import type { ReportContext, ReportsExtraFilter } from './reportsResource';
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
// Excel / Print / Download PDF, all disabled until a report is selected;
// Download PDF is not offered on Android) → if the report declares an argument
// schema, S3 (ArgumentsModal) collects filters first → generate → fetch the
// file handle → print (HTML, hidden-iframe window.print, desktop) or download
// (Excel/PDF). Errors show INLINE in the dialog body (spec/reports S5 — never
// a toast).
//
// The trigger button lives with the host vertical; this component is the dialog
// body + its own phase state, mounted only while open (like the action modals,
// kdd/action-modal) so each open starts fresh.

export interface SelectReportModalProps {
  context: ReportContext;
  /**
   * The host vertical's extra narrowing of the listed reports — e.g. internal
   * orders excludes sub-contexted (program R&R) forms
   * (spec/internal-orders contract › printing).
   */
  extraFilter?: ReportsExtraFilter;
  /** The record the reports render against (e.g. the stocktake id). */
  dataId: string;
  /** The host table's current sort, passed through to generation. */
  sort?: ReportSort;
  /**
   * Host-seeded generation arguments, merged into every generation beneath the
   * report form's own values (a form arg wins on key collision). Lets a record
   * screen seed context its templates need but no form collects — e.g. an
   * indicator internal order's program / period / customer identity (AC-PR4).
   */
  seedArgs?: Record<string, unknown>;
  onClose: () => void;
}

export const SelectReportModal: Component<SelectReportModalProps> = props => {
  // The form picker is this dialog's only control, so the dialog opens on
  // it (ui-standards › accessibility › keyboard).
  const picker = createFocusTarget();

  // The context's reports, fetched once when the dialog opens (the component is
  // mounted only while open). Read non-suspending via `.latest` so the dialog
  // shows its own spinner rather than tripping an outer Suspense boundary
  // (kdd/solid-reactivity-pitfalls).
  const [reports] = createResource(
    () => props.context,
    context => listReportsByContext(context, props.extraFilter)
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
  // The format carries the user's INTENT (HTML = print, Excel and PDF = keep)
  // and delivery forks on it; each arm's platform difference belongs to the
  // capability wrapper, not here. Await the delivery: a failure keeps the
  // dialog up with the inline error rather than closing as if it worked.
  const deliver = async (
    result: GenerateResult,
    format: PrintFormat
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
    // Print: system print dialog on the web, the OS print service on Android.
    // Export/download: the user picks the destination (browser download on
    // web, the OS save picker on Android).
    const delivered =
      format === 'HTML'
        ? await printBlob(file.blob, file.filename)
        : await saveBlob(file.blob, file.filename);
    if (!delivered.ok) {
      setPhase('error');
      return;
    }
    props.onClose();
  };

  const runGenerate = async (
    format: PrintFormat,
    args?: Record<string, unknown>
  ): Promise<void> => {
    const report = selected();
    if (!report) return;
    setPhase('generating');
    // The user's timezone travels even when the report has no argument form —
    // shipped templates read `arguments.timezone` unconditionally, and the
    // captured client sends `{ timezone }` alone on this path (AC-R11). Form
    // args, when present, already contain it and win on key collision.
    const result = await generateReport({
      reportId: report.id,
      dataId: props.dataId,
      format,
      args: { ...timezoneArgument(), ...props.seedArgs, ...args },
      sort: props.sort,
    });
    await deliver(result, format);
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
        initialFocus={picker}
        // Blocking while generating — no scrim/Escape exit mid-flight.
        dismissable={!busy()}
        onClose={props.onClose}
        icon={<PrinterIcon />}
        title={t('title.select-a-form')}
        widthRem={40}
        /*
         * No submit key (spec/keyboard KB-E2's opt-out). The footer offers
         * three FORMATS, not a confirm and its alternatives — Excel, Print and
         * PDF are equal choices, so there is no action Enter could mean.
         * Cancel still claims its role below, for the Escape badge and the
         * palette entry.
         */
        enterConfirms={false}
        actions={
          <>
            <Button
              variant="secondary"
              icon={<XCircleIcon />}
              confirms="cancel"
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
            {/* Download PDF is not offered on Android (spec/reports S4): the
                server renders PDFs by driving headless Chrome, and a tablet
                server has no Chrome executable to launch, so the format can
                only ever fail there. */}
            <Show when={!isAndroid()}>
              <Button
                variant="secondary"
                icon={<DownloadIcon />}
                disabled={disabled()}
                onClick={() => onFormat('PDF')}
              >
                {t('button.download-pdf')}
              </Button>
            </Show>
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
              focusTarget={picker}
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
