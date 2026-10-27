import {
  createSignal,
  createUniqueId,
  For,
  Show,
  splitProps,
  type JSX,
} from 'solid-js';
import { t, tPlural, localisedDate, formatFileSize } from '../../../intl';
import type { LocaleKey } from '../../../intl';
import { isAndroid } from '../../../platform';
import { openDocument } from '../../../platform/openDocument';
import { ChevronDownIcon, FileIcon, TrashIcon } from '../../icons';
import { Alert } from '../feedback/Alert';
import { ConfirmDialog } from '../feedback/ConfirmDialog';
import { Spinner } from '../feedback/Spinner';
import { IconButton } from '../buttons/IconButton';
import { Text } from '../typography/Text';
import { UploadZone } from '../inputs/UploadZone';
import type { FileRejection } from '../inputs/uploadFiles';
import styles from './DocumentUploadPanel.module.css';

/** A record document as shown in the list. Shapes to the generated GraphQL
 * fragment (id / fileName / createdDatetime / totalBytes) — no remapping. The
 * version fields are read only by a `versioned` list. */
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
  /** Versioned list: who uploaded this version (the "Uploaded by" column —
   * the latest version's uploader on a document's row, that version's on a
   * previous-version row). */
  uploadedBy?: string | null;
  /** Versioned list: this row's version number (1 = the first upload). */
  version?: number;
  /** Versioned list: the earlier versions of this document, newest first,
   * each reachable from the row. */
  previousVersions?: DocumentFile[];
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
  /**
   * Heading over the file list, already translated. Defaults to "Uploaded
   * documents". Name it when the list is NOT the record's own uploads — the
   * equipment detail shows the model's catalogue documents in a second panel
   * beside them.
   */
  listHeading?: string;
  /**
   * Each row is a document with versions rather than a single upload: the
   * list gains Uploaded by and Version columns (reading the rows' version
   * fields; the date is the row's own upload), and a row with
   * `previousVersions` can be expanded to list them. The caller does the
   * grouping (a record's documents module knows what makes two uploads one
   * document); the panel only presents it.
   */
  versioned?: boolean;
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

const date = (value: string | null | undefined): string =>
  value ? localisedDate(value) : '';

// The column name a cell carries for the narrow layout, where the header row
// is gone and each value has to say what it is (rendered by CSS from the
// attribute, so the copy stays translated). Omitted where the cell is blank,
// so an unrecorded uploader shows nothing rather than a bare label.
const label = (key: LocaleKey, value: unknown): string | undefined =>
  value === null || value === undefined || value === '' ? undefined : t(key);

/** The row awaiting its removal confirmation. `earlierVersion` marks one from
 * an unfolded versions list, so the confirm can say which version goes. */
export interface PendingDelete {
  document: DocumentFile;
  earlierVersion: boolean;
}

/**
 * What the removal confirm says. A versioned document with earlier versions is
 * not removed by its remove action — only its latest version is, and the one
 * beneath becomes current — so the plain "this will remove this document"
 * would promise more than happens. An earlier version names itself. A
 * single-version document, and every plain-list row, keeps the plain text.
 */
export const confirmDeleteMessage = (
  pending: PendingDelete | undefined,
  versioned: boolean | undefined
): string => {
  const version = pending?.document.version;
  if (!pending || !versioned || version === undefined)
    return t('messages.confirm-delete-document');
  if (pending.earlierVersion)
    return t('messages.confirm-delete-document-version', { version });
  // The version that becomes current is the next one down the list.
  const next = pending.document.previousVersions?.[0];
  if (!next) return t('messages.confirm-delete-document');
  return t('messages.confirm-delete-document-latest-version', {
    version,
    previous: next.version ?? '',
  });
};

/*
 * DocumentUploadPanel — the whole "Documents" surface: an optional drag & drop
 * upload zone above a plain file list (file-type icon, name link, date
 * uploaded, size, per-row delete). Not a DataTable — a semantic <ul> laid out
 * on a shared grid so headers and rows align. The caller owns the
 * upload/delete transport and refresh (they're record-specific), but NOT the
 * "are you sure?" that precedes a delete: removing a file is the same question
 * whatever record holds it, so the panel asks it and hands `onDelete` only the
 * confirmed removals. A consumer cannot forget the guard on a destructive
 * action. Opening is fully determined by the row's url + fileName, so the panel
 * owns that too.
 *
 * `versioned` adds the document-versions columns — who uploaded the row's
 * version and when, and the version number — and lets a row unfold its
 * earlier versions beneath it — the same
 * grid, so every version's cells line up under the document's. Which rows
 * are unfolded is the panel's own transient state, keyed by FILE NAME: a
 * versioned row is one document, and its name is the one thing that survives
 * a new upload or the removal of its latest version, both of which change the
 * id at the top of the row. The unfolded list stays in the DOM and is hidden
 * rather than torn down, so toggling never rebuilds the rows and the toggle's
 * aria-controls always names an element that exists.
 *
 * The name is a real anchor and stays one: every browser opens it, and so does
 * a host shell watching for a sync-file address. Only Android is intercepted,
 * through the openDocument platform capability, because there the WebView
 * would render the file inline with no way back (kdd/capacitor-plugins).
 * Modified clicks (new tab, copy link) keep anchor behaviour everywhere.
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
    'listHeading',
    'versioned',
  ]);

  const showUpload = () => local.canUpload !== false && !!local.onUpload;
  const [openError, setOpenError] = createSignal<string>();
  // The row whose file is being fetched/handed to the OS — its name shows a
  // small spinner (a large document takes seconds to download on Android),
  // and further opens are ignored until it lands. Cleared unconditionally so
  // no failure can leave it stuck.
  const [openingId, setOpeningId] = createSignal<string>();
  // Set by a row's delete button, cleared by either dialog answer.
  const [pendingDelete, setPendingDelete] = createSignal<PendingDelete>();

  const deleteMessage = (): string =>
    confirmDeleteMessage(pendingDelete(), local.versioned);
  // Versioned list: the documents whose earlier versions are unfolded, by
  // file name (see above).
  const [expanded, setExpanded] = createSignal<ReadonlySet<string>>(new Set());
  const toggleExpanded = (name: string) =>
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });

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

  // The file name, as the open/download link where there is one. Shared by a
  // document's row and each of its earlier versions' rows.
  const Name = (row: { document: DocumentFile }): JSX.Element => (
    <Show
      when={row.document.url}
      fallback={<span class={styles.name}>{row.document.fileName}</span>}
    >
      {url => (
        <a
          class={styles.nameLink}
          href={url()}
          target="_blank"
          rel="noreferrer"
          aria-busy={openingId() === row.document.id || undefined}
          onClick={event => {
            const modified =
              event.ctrlKey || event.metaKey || event.shiftKey || event.altKey;
            if (event.button !== 0 || modified) return;
            // Only Android needs the file taken out of the WebView by hand.
            // Every browser already opens an anchor correctly, and so does a
            // host shell that watches for a sync-file address — so off
            // Android the anchor is left alone rather than replaced with a
            // scripted open that the shell cannot see (#692).
            if (!isAndroid()) return;
            event.preventDefault();
            void onOpen(row.document, url());
          }}
        >
          {row.document.fileName}
          <Show when={openingId() === row.document.id}>
            {' '}
            <Spinner sizeRem={0.875} label={t('label.opening-file')} />
          </Show>
        </a>
      )}
    </Show>
  );

  const RemoveAction = (row: {
    document: DocumentFile;
    earlierVersion?: boolean;
  }): JSX.Element => (
    <span class={styles.rowAction}>
      <Show when={local.onDelete && row.document.canDelete !== false}>
        <IconButton
          icon={<TrashIcon />}
          label={t('button.remove-file')}
          variant="danger"
          size="small"
          data-testid="document-remove-button"
          onClick={() =>
            setPendingDelete({
              document: row.document,
              earlierVersion: row.earlierVersion === true,
            })
          }
        />
      </Show>
    </span>
  );

  // An earlier version of a document, beneath the document's own row: its
  // own uploader and upload moment, its version number, and its own open
  // and remove — the same grid, with the type glyph's cell left blank so the
  // version reads as the document's, not a document of its own.
  const VersionRow = (row: { document: DocumentFile }): JSX.Element => (
    <li class={styles.versionRow} data-testid="document-version-row">
      <span />
      <Name document={row.document} />
      <span class={styles.meta}>
        <span
          class={styles.user}
          data-label={label('label.uploaded-by', row.document.uploadedBy)}
        >
          {row.document.uploadedBy ?? ''}
        </span>
        <span
          class={styles.date}
          data-label={label('label.uploaded', row.document.createdDatetime)}
        >
          {date(row.document.createdDatetime)}
        </span>
        <span
          class={styles.version}
          data-testid="document-version"
          data-label={label('label.version', row.document.version)}
        >
          {row.document.version ?? ''}
        </span>
        <span class={styles.size}>
          {formatFileSize(row.document.totalBytes)}
        </span>
      </span>
      <RemoveAction document={row.document} earlierVersion />
    </li>
  );

  return (
    <div class={styles.panel} data-versioned={local.versioned || undefined}>
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
            inputTestId="document-upload-input"
          />
        </section>
      </Show>

      <div class={styles.list} data-versioned={local.versioned || undefined}>
        <Text variant="heading" level={3} class={styles.heading}>
          {local.listHeading ?? t('heading.uploaded-documents')}
        </Text>
        <Show when={openError()}>
          <Alert severity="error" class={styles.openError}>
            {openError()}
          </Alert>
        </Show>
        <Show
          when={local.documents.length > 0}
          fallback={
            <p class={styles.empty}>{t('messages.no-documents-uploaded')}</p>
          }
        >
          {/* The header row belongs to the POPULATED list, not the empty one:
              column names over nothing describe a table that isn't there, and
              read as a list that failed to load rather than one with no files
              in it. */}
          <div class={styles.headerRow}>
            <span />
            <span>{t('label.file-name')}</span>
            <Show
              when={local.versioned}
              fallback={<span>{t('label.date-uploaded')}</span>}
            >
              <span>{t('label.uploaded-by')}</span>
              <span>{t('label.uploaded')}</span>
              <span>{t('label.version')}</span>
            </Show>
            <span>{t('label.size')}</span>
            <span />
          </div>
          <ul class={styles.rows}>
            <For each={local.documents}>
              {document => {
                const previous = () => document.previousVersions ?? [];
                const isExpanded = () => expanded().has(document.fileName);
                // The unfolded list's id, for the toggle's aria-controls. Per
                // row instance, so it needs no DOM-unsafe file name in it.
                const versionsId = createUniqueId();
                return (
                  <li class={styles.item}>
                    <div class={styles.row} data-testid="document-row">
                      <FileTypeIcon fileName={document.fileName} />
                      <Name document={document} />
                      <Show
                        when={local.versioned}
                        fallback={
                          <>
                            <span class={styles.date}>
                              {date(document.createdDatetime)}
                            </span>
                            <span class={styles.size}>
                              {formatFileSize(document.totalBytes)}
                            </span>
                          </>
                        }
                      >
                        <span class={styles.meta}>
                          <span
                            class={styles.user}
                            data-label={label(
                              'label.uploaded-by',
                              document.uploadedBy
                            )}
                          >
                            {document.uploadedBy ?? ''}
                          </span>
                          <span
                            class={styles.date}
                            data-label={label(
                              'label.uploaded',
                              document.createdDatetime
                            )}
                          >
                            {date(document.createdDatetime)}
                          </span>
                          <span
                            class={styles.version}
                            data-testid="document-version"
                            data-label={label(
                              'label.version',
                              document.version
                            )}
                          >
                            {document.version ?? ''}
                            {/* The unfold sits with the version number: the
                                figure it explains. Absent when there is
                                nothing beneath the row. */}
                            <Show when={previous().length > 0}>
                              <IconButton
                                icon={
                                  <ChevronDownIcon
                                    class={
                                      isExpanded()
                                        ? `${styles.chevron} ${styles.chevronExpanded}`
                                        : styles.chevron
                                    }
                                    aria-hidden="true"
                                  />
                                }
                                // Names its document: several unfolds sit in
                                // one list, and the count alone tells them apart
                                // for nobody reading by label.
                                label={tPlural(
                                  'label.previous-versions-of',
                                  previous().length,
                                  { name: document.fileName }
                                )}
                                size="small"
                                aria-expanded={isExpanded()}
                                aria-controls={versionsId}
                                data-testid="document-versions-toggle"
                                onClick={() =>
                                  toggleExpanded(document.fileName)
                                }
                              />
                            </Show>
                          </span>
                          <span class={styles.size}>
                            {formatFileSize(document.totalBytes)}
                          </span>
                        </span>
                      </Show>
                      <RemoveAction document={document} />
                    </div>
                    {/* Mounted whenever there is something to unfold, and
                        hidden rather than removed while folded. */}
                    <Show when={local.versioned && previous().length > 0}>
                      <ul
                        class={styles.versionRows}
                        id={versionsId}
                        hidden={!isExpanded()}
                      >
                        <For each={previous()}>
                          {version => <VersionRow document={version} />}
                        </For>
                      </ul>
                    </Show>
                  </li>
                );
              }}
            </For>
          </ul>
        </Show>
      </div>
      <ConfirmDialog
        open={!!pendingDelete()}
        message={deleteMessage()}
        // Destructive, so the confirm carries the danger tone; its LABEL stays
        // the standard OK — only the tone is this action's own.
        confirmVariant="danger"
        onClose={() => setPendingDelete(undefined)}
        onConfirm={() => {
          const pending = pendingDelete();
          if (pending) local.onDelete?.(pending.document);
        }}
      />
    </div>
  );
};
