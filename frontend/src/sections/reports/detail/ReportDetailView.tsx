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
import { showToast } from '../../../ui/elements/feedback/Toast';
import { DownloadIcon, PrinterIcon, SlidersIcon } from '../../../ui/icons';
import { Report as ReportDocument } from '../api/reports.generated';
import type { ReportResult, ReportVariables } from '../api/reports.generated';
import type { GenerateReportVariables } from '../api/generate';
import { generateReport } from '../api/generate';
import { downloadBlob, fetchReportFile, printHtml } from '../api/files';
import { ArgumentsModal } from '../arguments/ArgumentsModal';
import { reportName } from '../reportName';

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
    return r ? reportName(r) : '';
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
  const generateVars = createMemo<GenerateReportVariables | undefined>(() => {
    const r = report();
    if (!r) return undefined;
    const args = reportArgs();
    if (r.argumentSchema && args === undefined) return undefined;
    return {
      storeId: params.storeId,
      reportId: r.id,
      format: 'HTML',
      arguments: args,
      currentLanguage: locale(),
      dataId: undefined,
    };
  });

  // Regenerates whenever the serialised request changes (new report or new
  // arguments). `.latest` keeps the current document on screen during a
  // regenerate rather than tearing the frame down
  // (kdd/solid-reactivity-pitfalls).
  const [generated] = createResource(
    () => {
      const vars = generateVars();
      return vars ? JSON.stringify(vars) : undefined;
    },
    async serialised =>
      generateReport(JSON.parse(serialised) as GenerateReportVariables)
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

  // Submit from S3: S2 owns navigation — write the arguments into the URL
  // query, which re-keys the generation resource (AC-U2 / AC-R1).
  const onArgsSubmit = (args: Record<string, unknown>) => {
    setArgsModalOpen(false);
    setSearchParams({ reportArgs: JSON.stringify(args) });
  };

  // Print (desktop path): fetch the current HTML file and open the system print
  // dialog (spec/reports "Printing and exporting"). Only meaningful once a
  // document exists.
  const onPrint = async () => {
    const r = result();
    if (r?.kind !== 'fileId') return;
    const file = await fetchReportFile(r.fileId);
    if (file.kind !== 'success') {
      showToast({ severity: 'error', message: t('report.print-failed') });
      return;
    }
    printHtml(await file.blob.text());
  };

  // Export: generate the same report as an Excel workbook and download it.
  const onExport = async () => {
    const r = report();
    if (!r) return;
    const gen = await generateReport({
      storeId: params.storeId,
      reportId: r.id,
      format: 'EXCEL',
      arguments: reportArgs(),
      currentLanguage: locale(),
      dataId: undefined,
    });
    if (gen.kind !== 'fileId') {
      showToast({ severity: 'error', message: t('report.export-failed') });
      return;
    }
    const file = await fetchReportFile(gen.fileId);
    if (file.kind !== 'success') {
      showToast({ severity: 'error', message: t('report.export-failed') });
      return;
    }
    downloadBlob(file.blob, file.filename);
  };

  // Crumbs are an accessor so t() + the report name re-resolve on locale change
  // (AC-U3). The leaf is the report's translated name.
  const crumbs = () => [
    {
      label: t('nav.reports'),
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
                label={t('report.action.filters')}
                icon={<SlidersIcon />}
                onClick={openFilters}
              />
            </Show>
            <IconButton
              label={t('report.action.print')}
              icon={<PrinterIcon />}
              disabled={result()?.kind !== 'fileId'}
              onClick={() => void onPrint()}
            />
            <IconButton
              label={t('report.action.export')}
              icon={<DownloadIcon />}
              disabled={!report()}
              onClick={() => void onExport()}
            />
          </HeaderButtons>
        </Header>
      }
    >
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
                <span>{t('report.generation-error')}</span>
                <details>
                  <summary>{t('report.generation-error-details')}</summary>
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
            onClose={() => setArgsModalOpen(false)}
            onSubmit={onArgsSubmit}
          />
        )}
      </Show>
    </Page>
  );
};

export default ReportDetailView;
