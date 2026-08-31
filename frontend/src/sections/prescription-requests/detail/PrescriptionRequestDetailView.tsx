import {
  createResource,
  createSignal,
  Show,
  type Component,
} from 'solid-js';
import { useNavigate, useParams } from '@solidjs/router';
import { graphqlFetch } from '../../../api/graphql';
import { gated } from '../../../api/gated';
import { t, tPlural } from '../../../intl';
import { Page } from '../../../ui/layout/Page/Page';
import { Header } from '../../../ui/layout/Header/Header';
import { Breadcrumb } from '../../../ui/layout/Header/Breadcrumb';
import { HeaderButtons } from '../../../ui/layout/Header/HeaderButtons';
import { HeaderToolbar } from '../../../ui/layout/Header/HeaderToolbar';
import { ContentFooter } from '../../../ui/layout/ContentFooter/ContentFooter';
import { ContentFooterActions } from '../../../ui/layout/ContentFooter/ContentFooterActions';
import { Button } from '../../../ui/elements/buttons/Button';
import { ConfirmDialog } from '../../../ui/elements/feedback/ConfirmDialog';
import { Spinner } from '../../../ui/elements/feedback/Spinner';
import { DataTable, type Column } from '../../../ui/elements/table/DataTable';
import { getNumberCell } from '../../../ui/elements/table/tableHelpers';
import { createTableConfig } from '../../../api/createTableConfig';
import {
  Tabs,
  TabList,
  TabPanel,
  type TabDef,
} from '../../../ui/elements/tabs/Tabs';
import { createSidePanelOpen } from '../../../ui/layout/SidePanel/createSidePanelOpen';
import { createAddAction } from '../../../ui/utils/keyActions';
import { ALT_M, ALT_N } from '../../../ui/utils/shortcuts';
import {
  CloseIcon,
  PlusCircleIcon,
  SidebarIcon,
  TrashIcon,
} from '../../../ui/icons';
import { createDebouncedEdit } from '../../../domain/debouncedEdit';
import { ActivityLogPanel } from '../../../domain/activityLog';
import { CustomFieldsEditTab } from '../../../domain/customFields';
import { asRequestStatus, isEditable } from '../prescriptionRequestStatus';
import {
  PrescriptionRequestDetail,
  type PrescriptionRequestFieldsFragment,
} from './prescriptionRequestDetail.generated';
import { DeletePrescriptionRequestLine } from './edit-modal/requestLineEdit.generated';
import {
  savePrescriptionRequest,
  type UpdateInput,
} from './prescriptionRequestUpdate';
import { PrescriptionRequestToolbar } from './PrescriptionRequestToolbar';
import {
  PrescriptionRequestSidePanel,
  type PrescriptionRequestEditFields,
} from './PrescriptionRequestSidePanel';
import { PrescriptionRequestStatusFooter } from './PrescriptionRequestStatusFooter';
import { RequestLineEditModal } from './edit-modal/RequestLineEditModal';
import { EditPatientModal } from '../../patients';

// The prescription-request detail (spec/prescription-requests/ui-surface.md S3):
// toolbar (patient / date / program / diagnosis / prominent
// custom fields), Details + Custom fields + Log tabs over the line table, the
// side panel, and the status footer with the Ready-to-dispense hand-over.
// Read-only past New: dead affordances are hidden and a row click opens the
// line editor's read-only face (AC-N5, AC-R3).

type Line = PrescriptionRequestFieldsFragment['lines']['nodes'][number];

const PrescriptionRequestDetailView: Component = () => {
  const params = useParams<{ storeId: string; requestId: string }>();
  const navigate = useNavigate();

  const [selectedIds, setSelectedIds] = createSignal<string[]>([]);
  const [sidePanelOpen, setSidePanelOpen] = createSidePanelOpen();
  const [activeTab, setActiveTab] = createSignal('details');
  // The line editor — the line it's open for ('new' = a fresh line);
  // undefined = closed. Mounted fresh per open.
  const [editState, setEditState] = createSignal<{ line?: Line }>();
  // The patient picker's edit-patient modal — the id it's open for.
  const [editPatientId, setEditPatientId] = createSignal<string>();
  const [deleteLinesConfirm, setDeleteLinesConfirm] = createSignal(false);

  // The request — header, side panel, AND lines in one read (a small line set;
  // no server paging). A not-found (bad id) promotes to the global modal. The
  // first read shows the local spinner; saves merge via mutate, line saves
  // refetch.
  const [data, { mutate, refetch }] = createResource(
    () => ({
      storeId: params.storeId,
      id: params.requestId,
    }),
    async variables => {
      const result = await graphqlFetch(PrescriptionRequestDetail, variables, {
        mapSuccessToError: d =>
          d.prescriptionRequest.__typename === 'RecordNotFound'
            ? d.prescriptionRequest.description
            : undefined,
      });
      if (result.kind !== 'success') return undefined;
      return result.data.prescriptionRequest.__typename === 'PrescriptionRequestNode'
        ? result.data.prescriptionRequest
        : undefined;
    }
  );
  // Non-suspending read: neither the first load nor a post-save refetch ever
  // trips a Suspense boundary (kdd/solid-reactivity-pitfalls § no remounts).
  const info = (): PrescriptionRequestFieldsFragment | undefined => gated(data);

  const status = () => asRequestStatus(info()?.status ?? 'DISPENSED');
  const disabled = () => !isEditable(status());

  const rows = (): Line[] =>
    (info()?.lines.nodes ?? [])
      .slice()
      .sort((a, b) =>
        (a.item?.name ?? '').localeCompare(b.item?.name ?? '')
      );

  const tableConfig = createTableConfig({
    tableId: 'prescription-request-detail',
  });

  const saveField = async (input: Omit<UpdateInput, 'id'>) => {
    const node = info();
    if (!node) return;
    const outcome = await savePrescriptionRequest(params.storeId, {
      id: node.id,
      ...input,
    });
    if (outcome.kind === 'saved')
      mutate(prev => (prev ? { ...prev, ...outcome.node } : prev));
  };

  // One debounced buffer for the entity's text field (comment), seeded per
  // request identity.
  const edit = createDebouncedEdit<PrescriptionRequestEditFields>({
    id: () => info()?.id ?? '',
    initial: () => ({
      comment: info()?.comment ?? '',
    }),
    save: patch =>
      void saveField(
        patch.comment !== undefined
          ? { comment: { value: patch.comment || null } }
          : {}
      ),
  });

  const runDeleteLines = async () => {
    for (const id of selectedIds()) {
      const result = await graphqlFetch(DeletePrescriptionRequestLine, {
        storeId: params.storeId,
        id,
      });
      if (result.kind !== 'success') break;
    }
    setDeleteLinesConfirm(false);
    setSelectedIds([]);
    void refetch();
  };

  // Alt+N — this screen's add action (spec/keyboard KB-R2). `info()` is the
  // `.state`-gated read above, so this predicate never suspends the palette.
  createAddAction({
    name: 'button.add-item',
    run: () => setEditState({}),
    disabled: () => !info() || disabled(),
  });

  // Custom-fields save (explicit-save tab) — patch-merged server-side;
  // returns true so the tab clears its dirty state.
  const saveCustomFields = async (
    patch: Record<string, unknown>
  ): Promise<boolean> => {
    const node = info();
    if (!node) return false;
    const outcome = await savePrescriptionRequest(params.storeId, {
      id: node.id,
      customFields: patch,
    });
    if (outcome.kind !== 'saved') return false;
    mutate(prev => (prev ? { ...prev, ...outcome.node } : prev));
    return true;
  };

  const openRow = (line: Line) => setEditState({ line });

  const columns = (): Column<Line, never>[] => [
    {
      c: { accessor: line => line.item?.code ?? '', id: 'itemCode' },
      header: () => t('label.code'),
    },
    {
      c: { accessor: line => line.item?.name ?? '', id: 'itemName' },
      header: () => t('label.name'),
      meta: { headerPosition: 'primary' },
    },
    {
      c: { key: 'numberOfUnits' },
      header: () => t('label.quantity'),
      ...getNumberCell(),
    },
    {
      c: { accessor: line => line.item?.unitName ?? '', id: 'unitName' },
      header: () => t('label.unit-name'),
    },
    {
      c: { accessor: line => line.note ?? '', id: 'note' },
      header: () => t('label.directions'),
    },
  ];

  const tabs = (): TabDef[] => [
    { value: 'details', label: t('label.details') },
    { value: 'custom-fields', label: t('label.custom-fields') },
    { value: 'log', label: t('label.log') },
  ];

  const crumbs = (node?: PrescriptionRequestFieldsFragment) => [
    {
      label: t('prescriptions'),
      to: `/${params.storeId}/dispensary/prescription-request`,
    },
    { label: node ? `${node.prescriptionRequestNumber}` : '…' },
  ];

  return (
    <Show when={info()} fallback={<Spinner center />}>
      {node => (
        <Tabs value={activeTab()} onValueChange={setActiveTab}>
          <Page
            fillBody
            header={
              <Header>
                <Breadcrumb crumbs={crumbs(node())} />
                <HeaderButtons>
                  {/* Add item — hidden once read-only. */}
                  <Show when={!disabled()}>
                    <Button
                      icon={<PlusCircleIcon />}
                      shortcut={ALT_N}
                      data-testid="add-item-button"
                      onClick={() => setEditState({})}
                    >
                      {t('button.add-item')}
                    </Button>
                  </Show>
                  <Show when={!sidePanelOpen()}>
                    <Button
                      variant="secondary"
                      icon={<SidebarIcon />}
                      data-testid="open-detail-panel-button"
                      shortcut={ALT_M}
                      onClick={() => setSidePanelOpen(true)}
                    >
                      {t('button.more')}
                    </Button>
                  </Show>
                </HeaderButtons>
                <HeaderToolbar>
                  <PrescriptionRequestToolbar
                    storeId={params.storeId}
                    node={node()}
                    disabled={disabled()}
                    onSave={input => void saveField(input)}
                    onEditPatient={setEditPatientId}
                  />
                </HeaderToolbar>
                <TabList tabs={tabs()} />
              </Header>
            }
            sidePanelOpen={sidePanelOpen()}
            sidePanelTitle={t('heading.additional-info')}
            onSidePanelClose={() => setSidePanelOpen(false)}
            sidePanelContent={
              <PrescriptionRequestSidePanel
                storeId={params.storeId}
                node={node()}
                disabled={disabled()}
                edit={edit}
                onDeleted={() =>
                  navigate(
                    `/${params.storeId}/dispensary/prescription-request`,
                    { replace: true }
                  )
                }
              />
            }
            contentFooter={
              <Show
                when={selectedIds().length > 0}
                fallback={
                  <PrescriptionRequestStatusFooter
                    storeId={params.storeId}
                    node={node()}
                    onSaved={saved =>
                      mutate(prev => (prev ? { ...prev, ...saved } : prev))
                    }
                  />
                }
              >
                <ContentFooter testId="actions-footer">
                  <strong data-testid="selected-rows-count">
                    {selectedIds().length} {t('label.selected')}
                  </strong>
                  <Show when={!disabled()}>
                    <Button
                      variant="secondary"
                      icon={<TrashIcon />}
                      data-testid="delete-lines-button"
                      onClick={() => setDeleteLinesConfirm(true)}
                    >
                      {t('button.delete-lines')}
                    </Button>
                  </Show>
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
            <TabPanel value="details">
              <DataTable
                columns={columns()}
                rows={rows()}
                rowKey={line => line.id}
                loading={data.loading && !info()}
                onRowClick={openRow}
                emptyMessage={t('error.no-items')}
                empty={
                  <Show when={!disabled()}>
                    <Button
                      variant="ghost"
                      shortcut={ALT_N}
                      data-testid="nothing-here-create-button"
                      onClick={() => setEditState({})}
                    >
                      {t('button.add-item')}
                    </Button>
                  </Show>
                }
                enableSelection={!disabled()}
                selectedIds={selectedIds()}
                onSelectionChange={setSelectedIds}
                config={tableConfig.config()}
                setConfig={tableConfig.setConfig}
                onSaveGlobalDefault={
                  tableConfig.canSaveGlobalDefault()
                    ? tableConfig.saveGlobalTableConfig
                    : undefined
                }
              />
            </TabPanel>
            <TabPanel value="custom-fields">
              <CustomFieldsEditTab
                scope="prescription_request"
                promoteToToolbar
                disabled={disabled()}
                values={node().customFields}
                onSave={saveCustomFields}
              />
            </TabPanel>
            <TabPanel value="log">
              <ActivityLogPanel recordId={node().id} storeId={params.storeId} />
            </TabPanel>
          </Page>

          {/* The S4 line editor — mounted fresh per open; the read-only face
              past New (AC-N5). */}
          <Show when={editState()} keyed>
            {state => (
              <RequestLineEditModal
                storeId={params.storeId}
                requestId={node().id}
                line={state.line}
                readOnly={disabled()}
                onClose={() => setEditState(undefined)}
                onSaved={() => void refetch()}
              />
            )}
          </Show>

          {/* The patient picker's edit-patient modal — in place over this
              screen; a save refetches so the toolbar/side panel show the
              patient's current name. */}
          <Show when={editPatientId()} keyed>
            {patientId => (
              <EditPatientModal
                storeId={params.storeId}
                patientId={patientId}
                onClose={() => setEditPatientId(undefined)}
                onSaved={() => void refetch()}
              />
            )}
          </Show>

          {/* Bulk line delete (with count). */}
          <ConfirmDialog
            open={deleteLinesConfirm()}
            onClose={() => setDeleteLinesConfirm(false)}
            title={t('heading.are-you-sure')}
            message={tPlural(
              'messages.confirm-delete-lines',
              selectedIds().length
            )}
            confirmVariant="danger"
            onConfirm={() => void runDeleteLines()}
          />
        </Tabs>
      )}
    </Show>
  );
};

export default PrescriptionRequestDetailView;
