import { createSignal, Show } from 'solid-js';
import { graphqlFetch } from '@/api/graphql';
import { MAX_UPLOAD_BYTES, uploadFile } from '@/api/postFiles';
import { formatNumber, t } from '@/intl';
import { todayCalendarDate } from '@/intl/calendarDate';
import { DetailCard } from '@/ui/layout/Detail/DetailCard';
import { Stack } from '@/ui/layout/Stack/Stack';
import { HStack } from '@/ui/layout/Stack/HStack';
import { Text } from '@/ui/elements/typography/Text';
import { Button } from '@/ui/elements/buttons/Button';
import { UploadZone } from '@/ui/elements/inputs/UploadZone';
import {
  chooseOne,
  type SingleFileChoice,
} from '@/ui/elements/inputs/uploadFiles';
import { Alert } from '@/ui/elements/feedback/Alert';
import {
  CentralDataErrorsFile,
  CentralDataImport,
  CentralDataImportPreview,
} from './centralData.generated';
import {
  IMPORT_ACCEPT,
  errorsFileName,
  errorsFileOutcome,
  importOutcome,
  pickRefusalMessage,
  refusalMessage,
  totals,
  unwrap,
  type Refusal,
} from './centralDataLogic';
import { ImportPreviewCard, type Preview } from './ImportPreviewCard';
import { saveStoredFile } from './saveStoredFile';

// S1's Import tab (spec/central-data/ui-surface.md § import card, preview
// card, after an import).

/**
 * The import's state and actions. Held by the page, so an open preview
 * survives the Import tab unmounting, and its pinned footer can act on it.
 */
export const createImport = () => {
  const [busy, setBusy] = createSignal(false);
  const [importError, setImportError] = createSignal<string>();
  // After an Import whose reply was lost, that the preview was run again.
  const [rechecked, setRechecked] = createSignal(false);
  const [preview, setPreview] = createSignal<Preview>();
  const [imported, setImported] = createSignal<ReturnType<typeof totals>>();
  const [downloadingErrors, setDownloadingErrors] = createSignal(false);

  /** A refusal ends this upload: nothing more can be done with it, so its
   *  preview goes too. */
  const refuse = (refusal: Refusal) => {
    setImportError(refusalMessage(refusal));
    setPreview(undefined);
  };

  // A `failed` outcome below has been reported by the global error modal, and
  // the preview stays.

  const upload = async (file: File) => {
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

  /** A pick or drop on the zone: one file starts over with it. */
  const pick = (choice: SingleFileChoice<File>) => {
    if (choice.kind === 'none') return;
    setPreview(undefined);
    setImported(undefined);
    setRechecked(false);
    if (choice.kind === 'chosen') {
      setImportError(undefined);
      void upload(choice.file);
    } else
      setImportError(pickRefusalMessage(choice.rejection, MAX_UPLOAD_BYTES));
  };

  const chooseAnother = () => {
    setPreview(undefined);
    setImportError(undefined);
    setRechecked(false);
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
    if (outcome.kind === 'file')
      setImportError(
        await saveStoredFile(outcome.fileId, errorsFileName(current.fileName))
      );
    else if (outcome.kind !== 'failed') refuse(outcome);
    setDownloadingErrors(false);
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

  const confirm = async (current: Preview) => {
    setBusy(true);
    setRechecked(false);
    const outcome = importOutcome(
      unwrap(
        // The user's own date, for dates the server sets
        // (rules.md § currencies).
        await graphqlFetch(CentralDataImport, {
          fileId: current.fileId,
          today: todayCalendarDate(),
        }),
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

  return {
    busy,
    importError,
    rechecked,
    preview,
    imported,
    downloadingErrors,
    pick,
    chooseAnother,
    downloadErrors,
    confirm,
  };
};

export type ImportState = ReturnType<typeof createImport>;

/** The Import tab: the import card, then the success banner and the preview
 *  card. Its actions sit in the page's pinned footer. */
export const ImportCard = (props: { state: ImportState }) => (
  <Stack gap="lg">
    <DetailCard>
      <Stack>
        {/* With a preview open, the file's line replaces the zone. */}
        <Show
          when={props.state.preview()}
          fallback={
            <>
              <Text>{t('messages.central-data-import-limits')}</Text>
              <Text>{t('messages.central-data-import-start-from-export')}</Text>
              <UploadZone
                multiple={false}
                accept={IMPORT_ACCEPT}
                maxSize={MAX_UPLOAD_BYTES}
                loading={props.state.busy()}
                inputTestId="central-data-import-input"
                onPick={(accepted, rejected) =>
                  props.state.pick(chooseOne(accepted, rejected))
                }
              />
            </>
          }
        >
          {current => (
            <HStack justify="between" align="center" gap="sm" wrap>
              <Text variant="subtitle">{current().fileName}</Text>
              <Button
                variant="secondary"
                disabled={props.state.busy() || props.state.downloadingErrors()}
                data-testid="central-data-choose-another"
                onClick={() => props.state.chooseAnother()}
              >
                {t('button.choose-another-file')}
              </Button>
            </HStack>
          )}
        </Show>
        <Show when={props.state.importError()}>
          <Alert severity="error" testId="central-data-import-error">
            {props.state.importError()}
          </Alert>
        </Show>
        <Show when={props.state.rechecked()}>
          <Alert severity="warning" testId="central-data-import-rechecked">
            {t('messages.central-data-import-rechecked')}
          </Alert>
        </Show>
      </Stack>
    </DetailCard>

    <Show when={props.state.imported()}>
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
    <Show when={props.state.preview()} keyed>
      {current => (
        <ImportPreviewCard
          preview={current}
          rechecked={props.state.rechecked()}
        />
      )}
    </Show>
  </Stack>
);
