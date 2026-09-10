import { createSignal, Show, type Component } from 'solid-js';
import { formatFileSize, t } from '@/intl';
import { DocumentUploadPanel } from '@/ui/elements/display/DocumentUploadPanel';
import { Alert } from '@/ui/elements/feedback/Alert';
import { Stack } from '@/ui/layout/Stack/Stack';
import { ContentContainer } from '@/ui/layout/ContentContainer/ContentContainer';
import { FormColumns } from '@/ui/layout/Form/FormColumns';
import { FormColumn } from '@/ui/layout/Form/FormColumn';
import type { FileRejection } from '@/ui/elements/inputs/uploadFiles';
import {
  deleteSyncFile,
  syncFileUrl,
  uploadSyncFiles,
} from '@/domain/syncFiles';
import type { AssetDetailFragment } from '../equipment.generated';

// S2.4 — the Documents tab (ui-surface S2.4): two halves side by side.
//
// The trailing half is the record's own paperwork — the shared
// record-documents panel over the sync-file REST store, keyed to the "asset"
// table by the asset's id.
//
// The leading half is the CATALOGUE's documents: the model's manual, its
// specification sheet. It is always empty, and specified that way (AC-D4) —
// `AssetCatalogueItemNode` exposes no documents field, so there is nothing for
// it to read (contract ⚠️ wire trap). It is still rendered: the half tells a
// user where a model's paperwork would appear and that this model has none,
// which a missing half does not.
const TABLE_NAME = 'asset';

// Accepted types: PDF/DOCX/XLSX/CSV/TXT/ODT/ODS/JPEG/PNG/WEBP, matched on
// extension (the shared client-side accept list — the server stores any type).
const ACCEPT = '.pdf,.docx,.xlsx,.csv,.txt,.odt,.ods,.jpeg,.jpg,.png,.webp';
const MAX_FILE_BYTES = 50 * 1024 * 1024; // 50MB per file
const MAX_BATCH_BYTES = 100 * 1024 * 1024; // 100MB per request

export const DocumentsTab: Component<{
  asset: AssetDetailFragment;
  /** Re-read the asset so the new documents list shows. */
  onChanged: () => void;
}> = props => {
  const [errorMessage, setErrorMessage] = createSignal<string>();

  const onUpload = async (files: File[]) => {
    setErrorMessage(undefined);
    // A batch at/over 100MB is refused whole before anything is sent.
    const total = files.reduce((sum, file) => sum + file.size, 0);
    if (total >= MAX_BATCH_BYTES) {
      setErrorMessage(
        t('error.upload-too-large', {
          maxSize: formatFileSize(MAX_BATCH_BYTES),
        })
      );
      return;
    }
    const result = await uploadSyncFiles(TABLE_NAME, props.asset.id, files);
    if (result.ok) props.onChanged();
    else setErrorMessage(result.message);
  };

  const onDelete = async (document: { id: string }) => {
    setErrorMessage(undefined);
    const result = await deleteSyncFile(
      TABLE_NAME,
      props.asset.id,
      document.id
    );
    if (result.ok) props.onChanged();
    else setErrorMessage(result.message);
  };

  // Per-file rejections: each unacceptable file named with its reason;
  // acceptable files still upload (UploadZone hands them on separately).
  const onRejected = (rejections: FileRejection<File>[]) => {
    setErrorMessage(
      rejections
        .map(rejection =>
          rejection.reason === 'size'
            ? t('error.file-exceeds-size-limit', {
                filename: rejection.file.name,
                maxSize: formatFileSize(MAX_FILE_BYTES),
              })
            : t('error.file-type-not-supported', {
                filename: rejection.file.name,
              })
        )
        .join('\n')
    );
  };

  return (
    // The page is fillBody for its table tabs, so this content brings the
    // body padding it would otherwise inherit.
    <ContentContainer size="wide" padded>
      <Stack>
        <Show when={errorMessage()}>
          {message => <Alert severity="error">{message()}</Alert>}
        </Show>
        <FormColumns>
          <FormColumn>
            {/* The catalogue half — list only, no upload zone: a model's
                documents are the catalogue's to publish, not this store's. */}
            <DocumentUploadPanel
              documents={[]}
              listHeading={t('heading.download-catalogue-documents')}
            />
          </FormColumn>
          <FormColumn>
            <DocumentUploadPanel
              documents={props.asset.documents.nodes.map(document => ({
                id: document.id,
                fileName: document.fileName,
                createdDatetime: document.createdDatetime,
                totalBytes: document.totalBytes,
                url: syncFileUrl(TABLE_NAME, props.asset.id, document.id),
              }))}
              accept={ACCEPT}
              maxSize={MAX_FILE_BYTES}
              onUpload={files => void onUpload(files)}
              onDelete={document => void onDelete(document)}
              onRejected={onRejected}
            />
          </FormColumn>
        </FormColumns>
      </Stack>
    </ContentContainer>
  );
};
