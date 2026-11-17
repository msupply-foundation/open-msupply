import { createSignal, Show, type Component } from 'solid-js';
import { createStore } from 'solid-js/store';
import { useSearchParams } from '@solidjs/router';
import { graphqlFetch } from '@/api/graphql';
import { MAX_UPLOAD_BYTES, uploadFile } from '@/api/postFiles';
import { fileUrl } from '@/config';
import { formatNumber, t } from '@/intl';
import { saveDocument } from '@/platform/openDocument';
import { Page } from '@/ui/layout/Page/Page';
import { Header } from '@/ui/layout/Header/Header';
import { Breadcrumb } from '@/ui/layout/Header/Breadcrumb';
import { ContentContainer } from '@/ui/layout/ContentContainer/ContentContainer';
import { DetailCard } from '@/ui/layout/Detail/DetailCard';
import { Stack } from '@/ui/layout/Stack/Stack';
import { HStack } from '@/ui/layout/Stack/HStack';
import { Text } from '@/ui/elements/typography/Text';
import { Button } from '@/ui/elements/buttons/Button';
import { UploadZone } from '@/ui/elements/inputs/UploadZone';
import { chooseOne, tooLargeMessage } from '@/ui/elements/inputs/uploadFiles';
import { Alert } from '@/ui/elements/feedback/Alert';
import { Tabs, TabList, TabPanel, type TabDef } from '@/ui/elements/tabs/Tabs';
import {
  CentralDataErrorsFile,
  CentralDataImport,
  CentralDataImportPreview,
} from './centralData.generated';
import {
  IMPORT_ACCEPT,
  emptyFilters,
  errorsFileName,
  errorsFileOutcome,
  importOutcome,
  totals,
  unwrap,
  refusalMessage,
  type Refusal,
} from './centralDataLogic';
import { ExportCard } from './ExportCard';
import {
  ImportPreviewCard,
  ImportPreviewFooter,
  type Preview,
} from './ImportPreviewCard';

// S1 — Import and export (spec/central-data/ui-surface.md), as two tabs.

// Offered only on a standalone central server: the menu entry's gate hides it
// elsewhere and its route redirects (spec/navigation § central administration).
const CentralDataPage: Component = () => {
  const [busy, setBusy] = createSignal(false);
  const [importError, setImportError] = createSignal<string>();
  // After an Import whose reply was lost, that the preview was run again.
  const [rechecked, setRechecked] = createSignal(false);
  const [preview, setPreview] = createSignal<Preview>();
  const [imported, setImported] = createSignal<ReturnType<typeof totals>>();
  const [downloadingErrors, setDownloadingErrors] = createSignal(false);

  // Import is the default, so only Export shows in the address.
  const [searchParams, setSearchParams] = useSearchParams<{ tab?: string }>();
  const activeTab = () => (searchParams.tab === 'export' ? 'export' : 'import');
  const setActiveTab = (value: string) =>
    setSearchParams({ tab: value === 'export' ? value : undefined });
  const tabs = (): TabDef[] => [
    {
      value: 'import',
      label: t('button.import'),
      testId: 'central-data-tab-import',
    },
    {
      value: 'export',
      label: t('button.export'),
      testId: 'central-data-tab-export',
    },
  ];
  // Here, not in the card, so they survive the Export tab unmounting.
  const [exportFilters, setExportFilters] = createStore(emptyFilters());

  /** A refusal ends this upload: nothing more can be done with it, so its
   *  preview goes too. */
  const refuse = (refusal: Refusal) => {
    setImportError(refusalMessage(refusal));
    setPreview(undefined);
  };

  // A `failed` outcome below has been reported by the global error modal, and
  // the preview stays.

  const choose = async (file: File) => {
    setBusy(true);
    const uploaded = await uploadFile(file);
    if (uploaded.kind === 'failed') {
      setImportError(
        t('error.unable-to-upload-file', { reason: uploaded.message })
      );
      setBusy(false);
      return;
    }
    const outcome = importOutcome(
      unwrap(
        await graphqlFetch(CentralDataImportPreview, {
          fileId: uploaded.fileId,
        }),
        data => data.centralServer.centralData.importPreview
      )
    );
    if (outcome.kind === 'summary')
      setPreview({
        fileId: uploaded.fileId,
        fileName: file.name,
        summary: outcome.summary,
      });
    else if (outcome.kind !== 'failed') refuse(outcome);
    setBusy(false);
  };

  const downloadErrors = async (current: Preview) => {
    setDownloadingErrors(true);
    setImportError(undefined);
    const outcome = errorsFileOutcome(
      unwrap(
        await graphqlFetch(CentralDataErrorsFile, { fileId: current.fileId }),
        data => data.centralServer.centralData.errorsFile
      )
    );
    if (outcome.kind === 'file') {
      const saved = await saveDocument(
        fileUrl(outcome.fileId),
        errorsFileName(current.fileName)
      );
      if (!saved.ok)
        setImportError(
          t('error.unable-to-download-file', { reason: saved.message })
        );
    } else if (outcome.kind !== 'failed') refuse(outcome);
    setDownloadingErrors(false);
  };

  const confirm = async (current: Preview) => {
    setBusy(true);
    setRechecked(false);
    const outcome = importOutcome(
      unwrap(
        await graphqlFetch(CentralDataImport, { fileId: current.fileId }),
        data => data.centralServer.centralData.import
      )
    );
    if (outcome.kind === 'summary' && outcome.summary.errorCount === 0) {
      setPreview(undefined);
      setImported(totals(outcome.summary));
    } else if (outcome.kind === 'summary') {
      // The import's own check found errors; nothing was applied.
      setPreview({ ...current, summary: outcome.summary });
    } else if (outcome.kind === 'failed') await recheck(current);
    else refuse(outcome);
    setBusy(false);
  };

  /** A failed Import call may still have applied the import, so Import isn't
   *  offered again until a fresh preview shows what the file still changes. */
  const recheck = async (current: Preview) => {
    const outcome = importOutcome(
      unwrap(
        await graphqlFetch(CentralDataImportPreview, {
          fileId: current.fileId,
        }),
        data => data.centralServer.centralData.importPreview
      )
    );
    if (outcome.kind === 'summary') {
      setPreview({ ...current, summary: outcome.summary });
      setRechecked(true);
    } else if (outcome.kind === 'failed') {
      // Still unknown: choosing the file again previews it afresh.
      setPreview(undefined);
      setImportError(t('error.central-data-import-unconfirmed'));
    } else refuse(outcome);
  };

  return (
    <Tabs value={activeTab()} onValueChange={setActiveTab}>
      <Page
        header={
          <Header>
            <Breadcrumb crumbs={[{ label: t('central-data') }]} />
            <TabList tabs={tabs()} />
          </Header>
        }
        // Pinned, so Import stays in reach; on the Import tab only.
        contentFooter={
          <Show when={activeTab() === 'import' && preview()}>
            {current => (
              <ImportPreviewFooter
                preview={current()}
                busy={busy()}
                downloadingErrors={downloadingErrors()}
                onDownloadErrors={() => void downloadErrors(current())}
                onConfirm={() => void confirm(current())}
              />
            )}
          </Show>
        }
      >
        <ContentContainer size="wide">
          <TabPanel value="import">
            <Stack gap="lg">
              <DetailCard>
                <Stack>
                  {/* With a preview open, the file's line replaces the zone. */}
                  <Show
                    when={preview()}
                    fallback={
                      <>
                        <Text>{t('messages.central-data-import-limits')}</Text>
                        <Text>
                          {t('messages.central-data-import-start-from-export')}
                        </Text>
                        <UploadZone
                          multiple={false}
                          accept={IMPORT_ACCEPT}
                          maxSize={MAX_UPLOAD_BYTES}
                          loading={busy()}
                          inputTestId="central-data-import-input"
                          onPick={(accepted, rejected) => {
                            const pick = chooseOne(accepted, rejected);
                            if (pick.kind === 'none') return;
                            setPreview(undefined);
                            setImported(undefined);
                            setRechecked(false);
                            if (pick.kind === 'chosen') {
                              setImportError(undefined);
                              void choose(pick.file);
                            } else {
                              const { file, reason } = pick.rejection;
                              setImportError(
                                reason === 'size'
                                  ? tooLargeMessage(file.name, MAX_UPLOAD_BYTES)
                                  : t('error.central-data-xlsx-only')
                              );
                            }
                          }}
                        />
                      </>
                    }
                  >
                    {current => (
                      <HStack justify="between" align="center" gap="sm" wrap>
                        <Text variant="subtitle">{current().fileName}</Text>
                        <Button
                          variant="secondary"
                          disabled={busy() || downloadingErrors()}
                          data-testid="central-data-choose-another"
                          onClick={() => {
                            setPreview(undefined);
                            setImportError(undefined);
                            setRechecked(false);
                          }}
                        >
                          {t('button.choose-another-file')}
                        </Button>
                      </HStack>
                    )}
                  </Show>
                  <Show when={importError()}>
                    <Alert severity="error" testId="central-data-import-error">
                      {importError()}
                    </Alert>
                  </Show>
                  <Show when={rechecked()}>
                    <Alert
                      severity="warning"
                      testId="central-data-import-rechecked"
                    >
                      {t('messages.central-data-import-rechecked')}
                    </Alert>
                  </Show>
                </Stack>
              </DetailCard>

              <Show when={imported()}>
                {done => (
                  <Alert severity="success" testId="central-data-imported">
                    {t('messages.central-data-imported', {
                      new: formatNumber(done().inserted),
                      updated: formatNumber(done().updated),
                      deleted: formatNumber(done().deleted),
                    })}
                  </Alert>
                )}
              </Show>

              {/* Keyed, so each preview's lists start on page 1. */}
              <Show when={preview()} keyed>
                {current => <ImportPreviewCard preview={current} />}
              </Show>
            </Stack>
          </TabPanel>
          <TabPanel value="export">
            <ExportCard filters={exportFilters} setFilters={setExportFilters} />
          </TabPanel>
        </ContentContainer>
      </Page>
    </Tabs>
  );
};

export default CentralDataPage;
