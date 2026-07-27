import {
  createEffect,
  createMemo,
  createResource,
  createSignal,
  Match,
  on,
  Show,
  Switch,
} from 'solid-js';
import type { Component } from 'solid-js';
import { useNavigate, useParams, useSearchParams } from '@solidjs/router';
import { graphqlFetch } from '../../../api/graphql';
import { locale, t } from '../../../intl';
import { FILES_URL } from '../../../config';
import { Page } from '../../../ui/layout/Page/Page';
import { Header } from '../../../ui/layout/Header/Header';
import { Breadcrumb } from '../../../ui/layout/Header/Breadcrumb';
import { HeaderButtons } from '../../../ui/layout/Header/HeaderButtons';
import { IconButton } from '../../../ui/elements/buttons/IconButton';
import { Alert } from '../../../ui/elements/feedback/Alert';
import { Spinner } from '../../../ui/elements/feedback/Spinner';
import { DocumentFrame } from '../../../ui/elements/display/DocumentFrame';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../../../ui/elements/accordion/Accordion';
import type { LocaleKey } from '../../../intl';
import { DownloadIcon, PrinterIcon, SlidersIcon } from '../../../ui/icons';
import { Report as ReportDocument } from '../api/reports.generated';
import type { ReportResult, ReportVariables } from '../api/reports.generated';
// Generation and the label helper are the cross-vertical ones owned by
// domain/reports (shared with the S4 record-screen selector); dataId is
// omitted — S2's standalone reports render against the store, not a record.
import { generateReport, reportLabel } from '../../../domain/reports';
import { fetchReportFile, printHtml } from '../../../domain/reportFiles';
import { isAndroid } from '../../../platform';
import { openBlob, saveBlob } from '../../../platform/openDocument';
import { ArgumentsModal } from '../../../domain/json-forms/ArgumentsModal';
import { timezoneArgument } from '../../../domain/json-forms/schema';
import styles from './ReportDetailView.module.css';

// S2 — the single-report detail (spec/reports S2, AC-U1–U3, AC-R1, AC-G1/G4).
// Fetches the report (name + argument schema), then generates its HTML and
// embeds it. The chosen arguments round-trip through the URL query (AC-U2), so
// opening/reloading the route re-generates. With a schema and no URL arguments
// it opens the arguments modal (S3) first; otherwise it generates immediately.

type ReportNode = Extract<ReportResult['report'], { __typename: 'ReportNode' }>;

const ReportDetailView: Component = () => {
  const params = useParams<{ storeId: string; reportId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams<{
    reportArgs?: string;
  }>();

  // The chosen arguments, carried in the route's query string (AC-U2). Parsed
  // defensively: an absent or garbled param reads as "no arguments"
  // (undefined).
  const reportArgs = (): Record<string, unknown> | undefined => {
    const raw = searchParams.reportArgs;
    if (!raw) return undefined;
    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return undefined;
    }
  };

  // Fetch the report version by id (name + schema). Read via `.latest` so the
  // fetch never suspends the router boundary (kdd/solid-reactivity-pitfalls).
  const [reportRes] = createResource(
    () =>
      JSON.stringify({
        storeId: params.storeId,
        id: params.reportId,
        userLanguage: locale(),
      }),
    async serialised => {
      const result = await graphqlFetch(
        ReportDocument,
        JSON.parse(serialised) as ReportVariables
      );
      if (result.kind !== 'success') return undefined;
      return result.data.report.__typename === 'ReportNode'
        ? result.data.report
        : undefined;
    }
  );
  const report = (): ReportNode | undefined => reportRes.latest;
  const displayName = (): string => {
    const r = report();
    return r ? reportLabel(r) : '';
  };
  // The per-report explanation, keyed by report code in the message catalog
  // (AC-U9). Only some codes have copy — t() echoes the key back when no
  // catalog holds it, so a key-echo reads as "no disclosure" (the
  // translateServerError probe).
  const howToRead = (): string | undefined => {
    const code = report()?.code;
    if (!code) return undefined;
    const key = `messages.how-to-read-${code}` as LocaleKey;
    const copy = t(key);
    return copy === key ? undefined : copy;
  };

  // The report node when it declares an argument schema (drives whether the
  // arguments modal + Filters button exist).
  const schemaReport = (): ReportNode | undefined =>
    report()?.argumentSchema ? report() : undefined;

  const [argsModalOpen, setArgsModalOpen] = createSignal(false);

  // Auto-open S3 exactly when a schema'd report loads with no URL arguments
  // (spec S2 / AC-R1). Tracks only report + URL args, so Cancel — which changes
  // neither — leaves the modal closed instead of reopening it; Submit writes
  // the URL args, so the condition is false thereafter.
  createEffect(
    on([report, reportArgs], ([r, args]) => {
      if (r?.argumentSchema && args === undefined) setArgsModalOpen(true);
    })
  );

  // The generation request. Undefined while there is no report yet, or while a
  // schema'd report is still waiting for its arguments — a falsy resource
  // source simply doesn't fetch, so generation waits for the modal (AC-R1).
  // Carries `language` even though the domain wrapper reads locale() itself:
  // the serialised object is the resource key, and a language switch must
  // re-generate (AC-U3).
  const generateVars = createMemo<
    | { reportId: string; args?: Record<string, unknown>; language: string }
    | undefined
  >(() => {
    const r = report();
    if (!r) return undefined;
    const args = reportArgs();
    if (r.argumentSchema && args === undefined) return undefined;
    // A schema-less report generates immediately, but still with the user's
    // timezone — shipped templates read `arguments.timezone` unconditionally,
    // and the timezone alone travels on this path (AC-R11).
    return {
      reportId: r.id,
      args: args ?? timezoneArgument(),
      language: locale(),
    };
  });

  // Regenerates whenever the serialised request changes (new report, new
  // arguments, or language). `.latest` keeps the current document on screen
  // during a regenerate rather than tearing the frame down
  // (kdd/solid-reactivity-pitfalls).
  const [generated] = createResource(
    () => {
      const vars = generateVars();
      return vars ? JSON.stringify(vars) : undefined;
    },
    async serialised => {
      const vars = JSON.parse(serialised) as {
        reportId: string;
        args?: Record<string, unknown>;
      };
      return generateReport({
        reportId: vars.reportId,
        format: 'HTML',
        args: vars.args,
      });
    }
  );
  const result = () => generated.latest;

  const fileSrc = (): string | undefined => {
    const r = result();
    return r?.kind === 'fileId'
      ? `${FILES_URL}?id=${encodeURIComponent(r.fileId)}`
      : undefined;
  };
  const errorsJson = (): string => {
    const r = result();
    return r?.kind === 'dataError' ? JSON.stringify(r.errors, null, 2) : '';
  };

  // Initial loading: no report yet, or a request is in flight with no prior
  // result. A regenerate keeps the previous document (result stays defined) and
  // the DocumentFrame shows its own overlay when its src changes.
  const isLoading = (): boolean =>
    !report() || (generateVars() !== undefined && result() === undefined);

  const openFilters = () => setArgsModalOpen(true);

  // Print/export failures surface inline in the document region (no toasts —
  // spec S5). Cleared when a new action starts or new arguments regenerate.
  const [actionError, setActionError] = createSignal<LocaleKey | undefined>();

  // Submit from S3: S2 owns navigation — write the arguments into the URL
  // query, which re-keys the generation resource (AC-U2 / AC-R1).
  const onArgsSubmit = (args: Record<string, unknown>) => {
    setArgsModalOpen(false);
    setActionError(undefined);
    setSearchParams({ reportArgs: JSON.stringify(args) });
  };

  // Cancel from S3: with no URL arguments nothing has been generated (the
  // modal auto-opened on entry), so closing would strand the user on an empty
  // detail screen — return to the Reports page instead (spec S3). With
  // arguments present (a re-filter from the Filters button) just close; the
  // current document stays.
  const onArgsClose = () => {
    setArgsModalOpen(false);
    if (reportArgs() === undefined) navigate(`/${params.storeId}/reports`);
  };

  // Generate the same report in a file format and fetch the result; null with
  // the error already surfaced on failure.
  const generateFile = async (format: 'EXCEL' | 'PDF') => {
    const r = report();
    if (!r) return null;
    setActionError(undefined);
    const gen = await generateReport({
      reportId: r.id,
      format,
      args: reportArgs() ?? timezoneArgument(),
    });
    if (gen.kind !== 'fileId') {
      setActionError('error.failed-to-generate-report');
      return null;
    }
    const file = await fetchReportFile(gen.fileId);
    if (file.kind !== 'success') {
      setActionError('error.failed-to-generate-report');
      return null;
    }
    return file;
  };

  // Print — a VIEW intent: on the web, fetch the current HTML file and open
  // the system print dialog (spec/reports "Printing and exporting"). The
  // Android WebView has no window.print — hand a PDF to the OS viewer instead,
  // where printing (and save-as) lives on a tablet (spec/android § Files out
  // of the app).
  const onPrint = async () => {
    if (isAndroid()) {
      const file = await generateFile('PDF');
      if (!file) return;
      const delivered = await openBlob(file.blob, file.filename);
      if (!delivered.ok) setActionError('messages.cannot-open-file');
      return;
    }
    const r = result();
    if (r?.kind !== 'fileId') return;
    setActionError(undefined);
    const file = await fetchReportFile(r.fileId);
    if (file.kind !== 'success') {
      setActionError('error.failed-to-generate-report');
      return;
    }
    printHtml(await file.blob.text());
  };

  // Export — a KEEP intent: the same report as an Excel workbook, delivered
  // as a download (web) / the OS save picker (Android).
  const onExport = async () => {
    const file = await generateFile('EXCEL');
    if (!file) return;
    const delivered = await saveBlob(file.blob, file.filename);
    if (!delivered.ok) setActionError('messages.cannot-save-file');
  };

  // Crumbs are an accessor so t() + the report name re-resolve on locale change
  // (AC-U3). The leaf is the report's translated name.
  const crumbs = () => [
    {
      label: t('reports'),
      onClick: () => navigate(`/${params.storeId}/reports`),
    },
    { label: displayName() },
  ];

  return (
    <Page
      fillBody
      header={
        <Header>
          <Breadcrumb crumbs={crumbs()} />
          <HeaderButtons>
            <Show when={schemaReport()}>
              <IconButton
                label={t('label.filters')}
                icon={<SlidersIcon />}
                onClick={openFilters}
              />
            </Show>
            <IconButton
              label={t('button.print')}
              icon={<PrinterIcon />}
              disabled={result()?.kind !== 'fileId'}
              onClick={() => void onPrint()}
            />
            <IconButton
              label={t('button.export')}
              icon={<DownloadIcon />}
              disabled={!report()}
              onClick={() => void onExport()}
            />
          </HeaderButtons>
        </Header>
      }
    >
      <Show when={howToRead()}>
        {copy => (
          <div
            style={{
              padding: '0 var(--space-5)',
              'max-inline-size': '50rem',
            }}
          >
            <Accordion collapsible>
              <AccordionItem value="how-to-read">
                <AccordionTrigger class={styles.howToReadTrigger}>
                  {t('messages.how-to-read-report')}
                </AccordionTrigger>
                <AccordionContent>
                  <span style={{ 'white-space': 'pre-line' }}>{copy()}</span>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        )}
      </Show>
      <Show when={actionError()}>
        {key => (
          <div style={{ padding: 'var(--space-5) var(--space-5) 0' }}>
            <Alert severity="error">{t(key())}</Alert>
          </div>
        )}
      </Show>
      <Switch fallback={<></>}>
        <Match when={isLoading()}>
          <Spinner center />
        </Match>
        <Match when={result()?.kind === 'fileId'}>
          <DocumentFrame title={displayName()} src={fileSrc()} />
        </Match>
        <Match when={result()?.kind === 'dataError'}>
          {/* Data-fetch failure (AC-G4): the headline in the banner, the raw
              query errors tucked into a details affordance (spec S5). */}
          <div style={{ padding: 'var(--space-5)' }}>
            <Alert severity="error">
              <div
                style={{
                  display: 'flex',
                  'flex-direction': 'column',
                  gap: 'var(--space-2)',
                }}
              >
                <span>{t('error.failed-to-generate-report')}</span>
                <details>
                  <summary>{t('label.click-to-view')}</summary>
                  <pre
                    style={{
                      margin: 0,
                      'white-space': 'pre-wrap',
                      'overflow-wrap': 'anywhere',
                    }}
                  >
                    {errorsJson()}
                  </pre>
                </details>
              </div>
            </Alert>
          </div>
        </Match>
      </Switch>
      <Show when={schemaReport()}>
        {r => (
          <ArgumentsModal
            report={r()}
            open={argsModalOpen()}
            initialValues={reportArgs()}
            onClose={onArgsClose}
            onSubmit={onArgsSubmit}
          />
        )}
      </Show>
    </Page>
  );
};

export default ReportDetailView;
