import { createResource, createSignal, Show } from 'solid-js';
import { graphqlFetch } from '../../../api/graphql';
import { locale, t } from '../../../intl';
import { Dialog } from '../../../ui/elements/feedback/Dialog';
import { Button } from '../../../ui/elements/buttons/Button';
import { Combobox } from '../../../ui/elements/selectors/Combobox';
import { Alert } from '../../../ui/elements/feedback/Alert';
import { currentStoreId } from '../../../store/storeContext';
import { Reports } from '../api/reports.generated';
import type { ReportsVariables } from '../api/reports.generated';
import type { Report } from '../api/generate';
import { generateReport } from '../api/generate';
import { downloadBlob, fetchReportFile, printHtml } from '../api/files';
import { ArgumentsModal } from '../arguments/ArgumentsModal';
import { reportName } from '../reportName';

// S4 — the record-screen report selector (spec/reports S4, AC-X2, AC-U4).
// Print / export a single record using its context's reports. This vertical
// OWNS the dialog; the HOST vertical owns the trigger button (spec S4: the
// record screen's Export/Print action opens it) and controls `open`. It is
// exported from the section (index.tsx) for hosts to lazy-import; it is NOT
// wired into any host here.
//
// Host contract:
// - Render this next to your record screen; own the `open` state and the
//   trigger (an icon/menu action) that sets it true — this component ships no
//   trigger of its own.
// - `context` is the record's report context (e.g. STOCKTAKE); `dataId` is the
//   record id to render (spec/reports "Generation": record-context reports MUST
//   carry the record id). `sort` is the host's current list sort, passed
//   through to generation so a record renders in the user's chosen order
//   (best-effort, server-side — spec "Generation").
// - A successful print/export closes the modal; a failure keeps it open and
//   shows an inline error banner in the dialog body (no toasts — spec S5).

// The record context, derived from the generated Reports filter so it stays in
// lockstep with the schema (kdd/type-safety — no hand-written union).
export type ReportContext = NonNullable<
  NonNullable<NonNullable<ReportsVariables['filter']>['context']>['equalTo']
>;

export interface ReportSelectorModalProps {
  /** The record's report context — its reports are the selectable forms. */
  context: ReportContext;
  /** The record id to render (record-context reports require it). */
  dataId: string;
  /** The host's current list sort, passed through to generation (best-effort). */
  sort?: { key: string; desc?: boolean };
  open: boolean;
  onClose: () => void;
}

type ActionKind = 'print' | 'pdf' | 'excel';

export const ReportSelectorModal = (props: ReportSelectorModalProps) => {
  const [selected, setSelected] = createSignal<Report | null>(null);
  // The action awaiting the argument modal's OK (spec S4: a schema'd report
  // opens S3 before the action runs), and the action currently generating (for
  // the per-button spinner).
  const [pendingAction, setPendingAction] = createSignal<ActionKind>();
  const [runningAction, setRunningAction] = createSignal<ActionKind>();
  const [argsOpen, setArgsOpen] = createSignal(false);

  // Fetch the context's active reports only while the modal is open (spec S4 /
  // AC-X2). Keyed on the serialised request; `.latest` reads so the fetch never
  // suspends and the list is kept in place during a refetch
  // (kdd/solid-reactivity-pitfalls). No store loaded ⇒ no request.
  const variables = (): ReportsVariables | undefined => {
    if (!props.open) return undefined;
    const storeId = currentStoreId();
    if (!storeId) return undefined;
    return {
      storeId,
      userLanguage: locale(),
      filter: { context: { equalTo: props.context }, isActive: true },
    };
  };

  const [reportsRes] = createResource(
    () => {
      const vars = variables();
      return vars ? JSON.stringify(vars) : undefined;
    },
    async serialised => {
      const result = await graphqlFetch(
        Reports,
        JSON.parse(serialised) as ReportsVariables
      );
      if (result.kind !== 'success') return [];
      return result.data.reports.__typename === 'ReportConnector'
        ? result.data.reports.nodes
        : [];
    }
  );
  const reports = (): Report[] => reportsRes.latest ?? [];

  // The selected report when it declares an argument schema — gates whether S3
  // is interposed before the action (AC-R1).
  const selectedSchemaReport = (): Report | undefined => {
    const report = selected();
    return report?.argumentSchema ? report : undefined;
  };

  // The three actions are disabled until a report is chosen (AC-U4) and while
  // any action is generating (avoid overlapping generations).
  const actionsDisabled = (): boolean =>
    !selected() || runningAction() !== undefined;

  // A failed run's error, shown inline in the dialog body; cleared when a new
  // action starts or the selection changes.
  const [runError, setRunError] = createSignal(false);

  // Generate + deliver. Print fetches HTML and opens the system print dialog;
  // PDF/Excel download the file (spec "Printing and exporting"). Any failure —
  // typed data error, transport failure, or file fetch — shows an inline error
  // and leaves the modal open; success closes it.
  const runAction = async (
    kind: ActionKind,
    args: Record<string, unknown> | undefined
  ) => {
    const report = selected();
    const storeId = currentStoreId();
    if (!report || !storeId) return;
    setRunningAction(kind);
    setRunError(false);
    try {
      const format =
        kind === 'print' ? 'HTML' : kind === 'pdf' ? 'PDF' : 'EXCEL';
      const generated = await generateReport({
        storeId,
        reportId: report.id,
        dataId: props.dataId,
        arguments: args,
        format,
        sort: props.sort ?? null,
        currentLanguage: locale(),
      });
      if (generated.kind !== 'fileId') {
        setRunError(true);
        return;
      }
      const file = await fetchReportFile(generated.fileId);
      if (file.kind !== 'success') {
        setRunError(true);
        return;
      }
      if (kind === 'print') {
        printHtml(await file.blob.text());
      } else {
        downloadBlob(file.blob, file.filename);
      }
      props.onClose();
    } finally {
      setRunningAction(undefined);
    }
  };

  // Start an action: interpose S3 when the report has a schema (AC-R1),
  // otherwise generate immediately with no arguments.
  const startAction = (kind: ActionKind) => {
    const report = selected();
    if (!report) return;
    if (report.argumentSchema) {
      setPendingAction(kind);
      setArgsOpen(true);
    } else {
      void runAction(kind, undefined);
    }
  };

  const onArgsSubmit = (args: Record<string, unknown>) => {
    setArgsOpen(false);
    const kind = pendingAction();
    setPendingAction(undefined);
    if (kind) void runAction(kind, args);
  };

  const onArgsClose = () => {
    setArgsOpen(false);
    setPendingAction(undefined);
  };

  return (
    <>
      <Dialog
        open={props.open}
        onClose={() => props.onClose()}
        title={t('title.select-a-form')}
        actions={
          <>
            <Button variant="secondary" onClick={() => props.onClose()}>
              {t('button.cancel')}
            </Button>
            <Button
              disabled={actionsDisabled()}
              loading={runningAction() === 'excel'}
              onClick={() => startAction('excel')}
            >
              {t('button.export-to-excel')}
            </Button>
            <Button
              disabled={actionsDisabled()}
              loading={runningAction() === 'print'}
              onClick={() => startAction('print')}
            >
              {t('button.print')}
            </Button>
            <Button
              disabled={actionsDisabled()}
              loading={runningAction() === 'pdf'}
              onClick={() => startAction('pdf')}
            >
              {t('button.download-pdf')}
            </Button>
          </>
        }
      >
        <Combobox
          label={t('title.select-a-form')}
          hideLabel
          items={reports()}
          loading={reportsRes.loading}
          itemToString={report => reportName(report)}
          itemToValue={report => report.id}
          onChange={report => {
            setRunError(false);
            setSelected(() => report);
          }}
        />
        <Show when={runError()}>
          <Alert severity="error">{t('error.failed-to-generate-report')}</Alert>
        </Show>
      </Dialog>
      {/* A schema'd selection opens the argument modal (S3) over this dialog
          before the pending action runs (AC-R1). ArgumentsModal owns its own
          form; we only supply the report and collect the entered args. */}
      <Show when={selectedSchemaReport()}>
        {report => (
          <ArgumentsModal
            report={report()}
            open={argsOpen()}
            onClose={onArgsClose}
            onSubmit={onArgsSubmit}
          />
        )}
      </Show>
    </>
  );
};
