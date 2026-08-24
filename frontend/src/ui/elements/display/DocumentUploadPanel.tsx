import { createSignal, For, Show, splitProps, type JSX } from 'solid-js';
import { t, localisedDate, formatFileSize } from '../../../intl';
import { openDocument } from '../../../platform/openDocument';
import { FileIcon, TrashIcon } from '../../icons';
import { Alert } from '../feedback/Alert';
import { Spinner } from '../feedback/Spinner';
import { IconButton } from '../buttons/IconButton';
import { Text } from '../typography/Text';
import { UploadZone } from '../inputs/UploadZone';
import type { FileRejection } from '../inputs/uploadFiles';
import styles from './DocumentUploadPanel.module.css';

/** A record document as shown in the list. Shapes to the generated GraphQL
 * fragment (id / fileName / createdDatetime / totalBytes) — no remapping. */
export interface DocumentFile {
  id: string;
  fileName: string;
  createdDatetime?: string | null;
  totalBytes?: number | null;
  /** Link to open/download the file; the name renders as plain text without it.
   * */
  url?: string;
  /** Whether this row shows a delete action (default true). */
  canDelete?: boolean;
}

export interface DocumentUploadPanelProps {
  documents: DocumentFile[];
  /** Provide to show the upload zone; omit (or set canUpload=false) to hide it.
   * */
  onUpload?: (files: File[]) => void;
  onDelete?: (document: DocumentFile) => void;
  onRejected?: (rejections: FileRejection<File>[]) => void;
  /** Hide the upload zone even when `onUpload` is given (e.g. read-only
   * status). */
  canUpload?: boolean;
  /** Accept list + per-file size limit, forwarded to the upload zone. */
  accept?: string;
  maxSize?: number;
}

const extensionOf = (name: string): string => {
  const dot = name.lastIndexOf('.');
  return dot > 0 ? name.slice(dot + 1, dot + 5).toUpperCase() : '';
};

// The file glyph with its extension as a small caption — a typed-file marker
// without per-type brand colours (which would each need a palette token).
const FileTypeIcon = (props: { fileName: string }): JSX.Element => (
  <span class={styles.fileType}>
    <FileIcon />
    <Show when={extensionOf(props.fileName)}>
      {ext => <span class={styles.ext}>{ext()}</span>}
    </Show>
  </span>
);

/*
 * DocumentUploadPanel — the whole "Documents" surface: an optional drag & drop
 * upload zone above a plain file list (file-type icon, name link, date
 * uploaded, size, per-row delete). Not a DataTable — a semantic <ul> laid out
 * on a shared grid so headers and rows align. The caller owns the
 * upload/delete transport and refresh (they're record-specific); opening is
 * fully determined by the row's url + fileName, so the panel owns it —
 * routed through the openDocument platform capability (browser tab on web,
 * OS viewer on Android — kdd/capacitor-plugins). Modified clicks (new tab,
 * copy link) keep native anchor behaviour.
 */
export const DocumentUploadPanel = (
  props: DocumentUploadPanelProps
): JSX.Element => {
  const [local] = splitProps(props, [
    'documents',
    'onUpload',
    'onDelete',
    'onRejected',
    'canUpload',
    'accept',
    'maxSize',
  ]);

  const showUpload = () => local.canUpload !== false && !!local.onUpload;
  const [openError, setOpenError] = createSignal<string>();
  // The row whose file is being fetched/handed to the OS — its name shows a
  // small spinner (a large document takes seconds to download on Android),
  // and further opens are ignored until it lands. Cleared unconditionally so
  // no failure can leave it stuck.
  const [openingId, setOpeningId] = createSignal<string>();

  const onOpen = async (doc: DocumentFile, url: string) => {
    if (openingId()) return;
    setOpenError(undefined);
    setOpeningId(doc.id);
    try {
      const result = await openDocument(url, doc.fileName);
      if (!result.ok) setOpenError(result.message);
    } finally {
      setOpeningId(undefined);
    }
  };

  return (
    <div class={styles.panel}>
      <Show when={showUpload()}>
        <section>
          <Text variant="heading" level={3} class={styles.heading}>
            {t('heading.upload-documents')}
          </Text>
          <UploadZone
            onFiles={files => local.onUpload?.(files)}
            onRejected={local.onRejected}
            accept={local.accept}
            maxSize={local.maxSize}
            multiple
          />
        </section>
      </Show>

      <div class={styles.list}>
        <Text variant="heading" level={3} class={styles.heading}>
          {t('heading.uploaded-documents')}
        </Text>
        <Show when={openError()}>
          <Alert severity="error" class={styles.openError}>
            {openError()}
          </Alert>
        </Show>
        <div class={styles.headerRow}>
          <span />
          <span>{t('label.file-name')}</span>
          <span>{t('label.date-uploaded')}</span>
          <span>{t('label.size')}</span>
          <span />
        </div>

        <Show
          when={local.documents.length > 0}
          fallback={
            <p class={styles.empty}>{t('messages.no-documents-uploaded')}</p>
          }
        >
          <ul class={styles.rows}>
            <For each={local.documents}>
              {document => (
                <li class={styles.row}>
                  <FileTypeIcon fileName={document.fileName} />
                  <Show
                    when={document.url}
                    fallback={
                      <span class={styles.name}>{document.fileName}</span>
                    }
                  >
                    {url => (
                      <a
                        class={styles.nameLink}
                        href={url()}
                        target="_blank"
                        rel="noreferrer"
                        aria-busy={openingId() === document.id || undefined}
                        onClick={event => {
                          const modified =
                            event.ctrlKey ||
                            event.metaKey ||
                            event.shiftKey ||
                            event.altKey;
                          if (event.button !== 0 || modified) return;
                          event.preventDefault();
                          void onOpen(document, url());
                        }}
                      >
                        {document.fileName}
                        <Show when={openingId() === document.id}>
                          {' '}
                          <Spinner
                            sizeRem={0.875}
                            label={t('label.opening-file')}
                          />
                        </Show>
                      </a>
                    )}
                  </Show>
                  <span class={styles.date}>
                    {document.createdDatetime
                      ? localisedDate(document.createdDatetime)
                      : ''}
                  </span>
                  <span class={styles.size}>
                    {formatFileSize(document.totalBytes)}
                  </span>
                  <span class={styles.rowAction}>
                    <Show when={local.onDelete && document.canDelete !== false}>
                      <IconButton
                        icon={<TrashIcon />}
                        label={t('button.remove-file')}
                        variant="danger"
                        size="small"
                        onClick={() => local.onDelete?.(document)}
                      />
                    </Show>
                  </span>
                </li>
              )}
            </For>
          </ul>
        </Show>
      </div>
    </div>
  );
};
