import { createMemo, createResource, createSignal, Show } from 'solid-js';
import type { Component } from 'solid-js';
import { graphqlFetch } from '../../api/graphql';
import { t, tPlural } from '../../intl';
import { Page } from '../../ui/layout/Page/Page';
import { Header } from '../../ui/layout/Header/Header';
import { Breadcrumb } from '../../ui/layout/Header/Breadcrumb';
import { HeaderButtons } from '../../ui/layout/Header/HeaderButtons';
import { ContentFooter } from '../../ui/layout/ContentFooter/ContentFooter';
import { ContentFooterActions } from '../../ui/layout/ContentFooter/ContentFooterActions';
import { Button } from '../../ui/elements/buttons/Button';
import { ConfirmDialog } from '../../ui/elements/feedback/ConfirmDialog';
import { DataTable, type Column } from '../../ui/elements/table/DataTable';
import { getDateCell } from '../../ui/elements/table/tableHelpers';
import { createTableConfig } from '../../api/createTableConfig';
import {
  CloseIcon,
  DownloadIcon,
  PlusCircleIcon,
  TrashIcon,
} from '../../ui/icons';
import { syncFileUrl } from '../../domain/syncFiles';
import { HelpDocuments } from './helpDocuments.generated';
import type { HelpDocumentsResult } from './helpDocuments.generated';
import { DeleteHelpDocument } from './helpDocumentMutations.generated';
import { sortDocuments } from './helpDocumentsLogic';
import { UploadHelpDocumentModal } from './UploadHelpDocumentModal';

// S2 — central help-document management (spec/help S2). Publish (via S3) and
// remove the documents every site lists. Reached only on a central server by a
// server admin (the nav entry is gated in ShellLayout; a route guard blocks
// direct-URL entry — see index.tsx). Not store-scoped: the list is server-wide,
// loaded in full (no paging), newest-first, with a client-side Title sort.
// Composes library components only (no page CSS — principle #10); mirrors the
// reference list screen (StocktakesList).

const TABLE_NAME = 'help_document';

type HelpDocRow = HelpDocumentsResult['helpDocuments']['nodes'][number];
// Title is the one client-sortable column (spec/help S2).
type SortKey = 'title';

const HelpDocumentsManagement: Component = () => {
  // Server-wide list (no storeId). Read `data.latest` (non-suspending) so the
  // refetch after an upload/delete never suspends the boundary — which would
  // remount the table and lose the selection / any open dialog
  // (kdd/solid-reactivity-pitfalls).
  const [data, { refetch }] = createResource(async () => {
    const result = await graphqlFetch(HelpDocuments, {});
    if (result.kind !== 'success') return [];
    return result.data.helpDocuments.nodes;
  });
  const rows = () => data.latest ?? [];

  // Client-side Title sort: undefined = the server order (newest-first); a
  // header click toggles asc/desc (OMS-REG-HLP-01.33).
  const [sort, setSort] = createSignal<{ desc: boolean }>();
  const sortedRows = createMemo(() => sortDocuments(rows(), sort()));

  const [selectedIds, setSelectedIds] = createSignal<string[]>([]);
  const [uploadOpen, setUploadOpen] = createSignal(false);
  const [deleteOpen, setDeleteOpen] = createSignal(false);

  const tableConfig = createTableConfig({ tableId: 'help-documents' });

  const currentSort = () =>
    sort() ? { key: 'title' as SortKey, desc: sort()!.desc } : undefined;
  // The only sortable column is Title, so the key is fixed.
  const onSort = (_key: SortKey, desc: boolean) => setSort({ desc });

  const fileOf = (doc: HelpDocRow) => doc.files.nodes[0];

  // Download each selected document's file, sequentially (spec/help S2). The
  // downloads themselves are the outcome; selection persists.
  const downloadSelected = () => {
    const selected = new Set(selectedIds());
    for (const doc of rows()) {
      if (!selected.has(doc.id)) continue;
      const file = fileOf(doc);
      if (!file) continue;
      const link = document.createElement('a');
      link.href = syncFileUrl(TABLE_NAME, doc.id, file.id);
      link.download = file.fileName;
      link.rel = 'noreferrer';
      document.body.appendChild(link);
      link.click();
      link.remove();
    }
  };

  // Per-document independent deletion (OMS-REG-HLP-01.34): each runs on its
  // own, one failure not undoing the others. returnGraphqlErrors keeps a
  // RecordNotFound (already-gone, .35) from tripping the global modal — the row
  // vanishes on the refetch regardless. Best-effort, then re-read the list.
  const confirmDelete = async () => {
    await Promise.all(
      selectedIds().map(id =>
        graphqlFetch(
          DeleteHelpDocument,
          { input: { id } },
          { returnGraphqlErrors: true }
        )
      )
    );
    setSelectedIds([]);
    void refetch();
  };

  // Columns/crumbs are accessors so their t() text re-translates on a language
  // switch (read in a reactive scope).
  const columns = (): Column<HelpDocRow, SortKey>[] => [
    {
      c: { key: 'title' },
      sortKey: 'title',
      header: () => t('label.title'),
    },
    {
      // A display column: the value is the first file's name, rendered as a
      // link that opens it inline; empty for a fileless record
      // (OMS-REG-HLP-01.32).
      c: { id: 'filename' },
      header: () => t('label.filename'),
      cell: info => {
        const doc = info.row.original;
        const file = fileOf(doc);
        return (
          <Show when={file}>
            <a
              href={syncFileUrl(TABLE_NAME, doc.id, file.id)}
              target="_blank"
              rel="noreferrer"
            >
              {file.fileName}
            </a>
          </Show>
        );
      },
    },
    {
      c: { key: 'createdDatetime' },
      header: () => t('label.uploaded'),
      ...getDateCell(),
    },
  ];

  const crumbs = () => [{ label: t('help-documents') }];

  const uploadButton = () => (
    <Button icon={<PlusCircleIcon />} onClick={() => setUploadOpen(true)}>
      {t('button.upload-help-document')}
    </Button>
  );

  return (
    <Page
      fillBody
      header={
        <Header>
          <Breadcrumb crumbs={crumbs()} />
          <HeaderButtons>{uploadButton()}</HeaderButtons>
        </Header>
      }
      contentFooter={
        <Show when={selectedIds().length > 0}>
          <ContentFooter testId="actions-footer">
            <strong data-testid="selected-rows-count">
              {selectedIds().length} {t('label.selected')}
            </strong>
            <Button
              variant="secondary"
              icon={<DownloadIcon />}
              onClick={downloadSelected}
            >
              {t('button.download')}
            </Button>
            <Button
              variant="danger"
              icon={<TrashIcon />}
              onClick={() => setDeleteOpen(true)}
            >
              {t('button.delete-lines')}
            </Button>
            <ContentFooterActions>
              <Button
                variant="secondary"
                icon={<CloseIcon />}
                onClick={() => setSelectedIds([])}
              >
                {t('label.clear-selection')}
              </Button>
            </ContentFooterActions>
          </ContentFooter>
        </Show>
      }
    >
      <DataTable
        columns={columns()}
        rows={sortedRows()}
        rowKey={r => r.id}
        loading={data.loading}
        sort={currentSort()}
        onSort={onSort}
        emptyMessage={t('error.no-help-documents')}
        empty={uploadButton()}
        enableSelection
        selectedIds={selectedIds()}
        onSelectionChange={setSelectedIds}
        config={tableConfig.config()}
        setConfig={tableConfig.setConfig}
        configIsDefault={tableConfig.isConfigDefault()}
      />
      <UploadHelpDocumentModal
        open={uploadOpen()}
        onClose={() => setUploadOpen(false)}
        onChanged={() => void refetch()}
      />
      <ConfirmDialog
        open={deleteOpen()}
        onClose={() => setDeleteOpen(false)}
        title={t('heading.are-you-sure')}
        message={tPlural(
          'messages.confirm-delete-help-documents',
          selectedIds().length
        )}
        confirmVariant="danger"
        onConfirm={() => void confirmDelete()}
      />
    </Page>
  );
};

export default HelpDocumentsManagement;
