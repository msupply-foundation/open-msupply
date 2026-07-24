import {
  createMemo,
  createResource,
  createSignal,
  Show,
  type Component,
} from 'solid-js';
import { useNavigate, useParams } from '@solidjs/router';
import { graphqlFetch } from '../../../api/graphql';
import { t, tPlural } from '../../../intl';
import { Page } from '../../../ui/layout/Page/Page';
import { Header } from '../../../ui/layout/Header/Header';
import { Breadcrumb } from '../../../ui/layout/Header/Breadcrumb';
import { HeaderButtons } from '../../../ui/layout/Header/HeaderButtons';
import { Toolbar } from '../../../ui/layout/Header/Toolbar';
import { ContentFooter } from '../../../ui/layout/ContentFooter/ContentFooter';
import { ContentFooterActions } from '../../../ui/layout/ContentFooter/ContentFooterActions';
import { Button } from '../../../ui/elements/buttons/Button';
import { SplitButton } from '../../../ui/elements/buttons/SplitButton';
import { Dialog } from '../../../ui/elements/feedback/Dialog';
import { Alert } from '../../../ui/elements/feedback/Alert';
import { ConfirmDialog } from '../../../ui/elements/feedback/ConfirmDialog';
import { Spinner } from '../../../ui/elements/feedback/Spinner';
import { DataTable, type Column } from '../../../ui/elements/table/DataTable';
import {
  getCommentCell,
  getCurrencyCell,
  getExpiryDateCell,
  getNumberCell,
} from '../../../ui/elements/table/tableHelpers';
import { createTableConfig } from '../../../api/createTableConfig';
import {
  Tabs,
  TabList,
  TabPanel,
  type TabDef,
} from '../../../ui/elements/tabs/Tabs';
import { createSidePanelOpen } from '../../../ui/layout/SidePanel/createSidePanelOpen';
import {
  CloseIcon,
  InfoIcon,
  PlusCircleIcon,
  PrinterIcon,
  SidebarIcon,
  TrashIcon,
} from '../../../ui/icons';
import { createDebouncedEdit } from '../../../domain/debouncedEdit';
import { ActivityLogPanel } from '../../../domain/activityLog';
import { CustomFieldsEditTab } from '../../../domain/customFields';
import { SelectReportModal } from '../../../domain/reports';
import {
  hasPermission,
  prescriptionPreferences,
} from '../../../store/storeContext';
import { storeNameOf } from '../../../auth/authContext';
import { asPrescriptionStatus, isReadOnly } from '../prescriptionStatus';
import {
  PrescriptionDetail,
  LabelPrinterSettings,
  type PrescriptionFieldsFragment,
} from './prescriptionDetail.generated';
import { InsuranceProviders, InsurancePolicies } from './insurance.generated';
import {
  deleteLines,
  savePrescription,
  type UpdateInput,
} from './prescriptionUpdate';
import { buildLabels, printLabels } from './labels';
import { PrescriptionToolbar } from './PrescriptionToolbar';
import {
  PrescriptionSidePanel,
  type PrescriptionEditFields,
} from './PrescriptionSidePanel';
import { PrescriptionStatusFooter } from './PrescriptionStatusFooter';
import { HistoryModal } from './HistoryModal';
import { PrescriptionLineEditModal } from './edit-modal/PrescriptionLineEditModal';

// The prescription detail (spec/prescriptions/ui-surface.md S3): toolbar
// (patient / clinician / date / program), Details + Log tabs over the flat
// line table (one row per dispensed line; carriers never render — AC-Q1/V1),
// the side panel, and the status footer. Dispensing happens in the S4 modal
// (D53). Read-only from VERIFIED: dead affordances are hidden (D39).

type Line = PrescriptionFieldsFragment['lines']['nodes'][number];

const PrescriptionDetailView: Component = () => {
  const params = useParams<{ storeId: string; prescriptionId: string }>();
  const navigate = useNavigate();

  const [selectedIds, setSelectedIds] = createSignal<string[]>([]);
  const [sidePanelOpen, setSidePanelOpen] = createSidePanelOpen();
  const [activeTab, setActiveTab] = createSignal('details');
  const [editState, setEditState] = createSignal<{
    itemId?: string;
    item?: { id: string; code: string; name: string };
  }>();
  const [historyOpen, setHistoryOpen] = createSignal(false);
  const [reportOpen, setReportOpen] = createSignal(false);
  const [deleteLinesConfirm, setDeleteLinesConfirm] = createSignal(false);
  const [printerMissing, setPrinterMissing] = createSignal(false);
  const [printingLabels, setPrintingLabels] = createSignal(false);

  // The prescription — header, side panel, AND lines in one read (a
  // prescription's line set is small; no server paging needed). A NodeError
  // (bad id) promotes to the global modal (AC-L5's blocking surface). The
  // first read suspends into the local <Suspense>; saves merge via mutate,
  // line saves refetch.
  const [data, { mutate, refetch }] = createResource(
    () => ({
      storeId: params.storeId,
      id: params.prescriptionId,
    }),
    async variables => {
      const result = await graphqlFetch(PrescriptionDetail, variables, {
        mapSuccessToError: d =>
          d.invoice.__typename === 'NodeError'
            ? d.invoice.error.description
            : undefined,
      });
      if (result.kind !== 'success') return undefined;
      return result.data.invoice.__typename === 'InvoiceNode'
        ? result.data.invoice
        : undefined;
    }
  );
  // Non-suspending read (kdd/solid-reactivity-pitfalls § no remounts): the
  // .state gate means neither the first load (pending → undefined → the
  // Show's spinner) nor a post-save refetch (refreshing → the previous node,
  // subtree kept — the open line-edit dialog included) ever trips a Suspense
  // boundary. `.latest` alone would suspend on the first pending read.
  const info = (): PrescriptionFieldsFragment | undefined =>
    data.state === 'ready' || data.state === 'refreshing'
      ? data.latest
      : undefined;

  // Insurance providers — the payment-window and insurance-status gates
  // (AC-Y1; provider presence, not a preference — captured as-is).
  const [providersData] = createResource(
    () => params.storeId,
    async storeId => {
      const result = await graphqlFetch(InsuranceProviders, { storeId });
      return result.kind === 'success'
        ? result.data.insuranceProviders.nodes.length > 0
        : undefined;
    }
  );
  const hasInsuranceProviders = () =>
    (providersData.state === 'ready' || providersData.state === 'refreshing'
      ? providersData.latest
      : undefined) ?? false;

  // The patient's policy count (the insured/not-insured row) — keyed on the
  // patient so a patient change refetches.
  const [policiesData] = createResource(
    () => info()?.patient?.id,
    async nameId => {
      const result = await graphqlFetch(InsurancePolicies, {
        storeId: params.storeId,
        nameId,
      });
      return result.kind === 'success'
        ? result.data.insurancePolicies.nodes.filter(p => p.isActive).length
        : undefined;
    }
  );

  const status = () => asPrescriptionStatus(info()?.status ?? 'CANCELLED');
  const disabled = () => isReadOnly(status());

  // The dispensed rows — carriers (prescribed-quantity holders) never render
  // as lines (AC-Q1); ordered by item then batch for a stable read.
  const rows = createMemo((): Line[] =>
    (info()?.lines.nodes ?? [])
      .filter(line => line.type === 'STOCK_OUT')
      .slice()
      .sort(
        (a, b) =>
          a.itemName.localeCompare(b.itemName) ||
          (a.batch ?? '').localeCompare(b.batch ?? '')
      )
  );
  const existingItemIds = () => [...new Set(rows().map(line => line.itemId))];

  const tableConfig = createTableConfig({
    tableId: 'prescription-detail',
    defaultConfig: {
      base: {
        // The long tail starts hidden (the user reveals via column settings);
        // directions/code/name/quantities stay visible.
        columnVisibility: {
          batch: false,
          expiryDate: false,
          locationName: false,
          unitName: false,
          packSize: false,
          costPrice: false,
        },
      },
    },
  });

  const saveField = async (input: Omit<UpdateInput, 'id'>) => {
    const node = info();
    if (!node) return;
    const outcome = await savePrescription(params.storeId, {
      id: node.id,
      ...input,
    });
    if (outcome.kind === 'saved')
      mutate(prev => (prev ? { ...prev, ...outcome.node } : prev));
  };

  // The AC-B2 flow: delete ALL lines, then apply the date/program change.
  const clearLinesAndSave = async (input: Omit<UpdateInput, 'id'>) => {
    const node = info();
    if (!node) return;
    const ok = await deleteLines(
      params.storeId,
      node.lines.nodes.map(line => line.id)
    );
    if (!ok) return;
    await saveField(input);
    void refetch();
  };

  // One debounced buffer across the entity's text fields (reference +
  // comment), seeded per prescription identity.
  const edit = createDebouncedEdit<PrescriptionEditFields>({
    id: () => info()?.id ?? '',
    initial: () => ({
      theirReference: info()?.theirReference ?? '',
      comment: info()?.comment ?? '',
    }),
    save: patch =>
      void saveField({
        ...(patch.theirReference !== undefined
          ? { theirReference: { value: patch.theirReference || null } }
          : {}),
        ...(patch.comment !== undefined ? { comment: patch.comment } : {}),
      }),
  });

  const runDeleteLines = async () => {
    const ok = await deleteLines(params.storeId, selectedIds());
    setDeleteLinesConfirm(false);
    if (ok) {
      setSelectedIds([]);
      void refetch();
    }
  };

  // Print labels (AC-E2): gated on a configured label printer; one label per
  // dispensed item — the whole prescription from the app bar, the selection
  // from the bulk bar.
  const runPrintLabels = async (lineIds?: string[]) => {
    const node = info();
    if (!node || printingLabels()) return;
    setPrintingLabels(true);
    try {
      const settings = await graphqlFetch(LabelPrinterSettings, {});
      if (
        settings.kind !== 'success' ||
        settings.data.labelPrinterSettings == null
      ) {
        setPrinterMissing(true);
        return;
      }
      const lines = lineIds
        ? rows().filter(line => lineIds.includes(line.id))
        : rows();
      await printLabels(buildLabels(node, storeNameOf(params.storeId), lines));
    } finally {
      setPrintingLabels(false);
    }
  };

  const openRow = (line: Line) => {
    if (!disabled())
      setEditState({
        itemId: line.itemId,
        item: { id: line.itemId, code: line.itemCode, name: line.itemName },
      });
  };

  const tabs = (): TabDef[] => [
    { value: 'details', label: t('label.details') },
    { value: 'custom-fields', label: t('label.custom-fields') },
    { value: 'log', label: t('label.log') },
  ];

  // Custom-fields save (explicit-save tab) — patch-merged server-side; returns
  // true so the tab clears its dirty state. The toolbar (prominent fields)
  // saves through saveField directly (fire-and-forget, like other header
  // fields).
  const saveCustomFields = async (
    patch: Record<string, unknown>
  ): Promise<boolean> => {
    const current = info();
    if (!current) return false;
    const outcome = await savePrescription(params.storeId, {
      id: current.id,
      customFields: patch,
    });
    if (outcome.kind === 'saved') {
      mutate(prev => (prev ? { ...prev, ...outcome.node } : prev));
      return true;
    }
    return false;
  };

  const prefs = prescriptionPreferences;

  const columns = (): Column<Line, never>[] => {
    const cols: Column<Line, never>[] = [
      {
        c: { accessor: line => line.note ?? '', id: 'directions' },
        header: t('label.comment'),
        ...getCommentCell(),
      },
      { c: { key: 'itemCode' }, header: t('label.code') },
      {
        c: { key: 'itemName' },
        header: t('label.name'),
        meta: { cardPosition: 'header-primary' },
      },
      { c: { key: 'batch' }, header: t('label.batch') },
      {
        c: { key: 'expiryDate' },
        header: t('label.expiry-date'),
        ...getExpiryDateCell(),
      },
      { c: { key: 'locationName' }, header: t('label.location') },
      {
        c: { accessor: line => line.item.unitName ?? '', id: 'unitName' },
        header: t('label.unit-name'),
      },
      {
        c: { key: 'packSize' },
        header: t('label.pack-size'),
        ...getNumberCell(),
      },
    ];
    if (prefs().manageVaccinesInDoses)
      cols.push({
        c: {
          accessor: line => (line.item.isVaccine ? line.item.doses : ''),
          id: 'dosesPerUnit',
        },
        header: t('label.doses-per-unit'),
        ...getNumberCell(),
      });
    cols.push({
      c: {
        accessor: line => line.numberOfPacks * line.packSize,
        id: 'unitQuantity',
      },
      header: t('label.unit-quantity'),
      ...getNumberCell(),
    });
    if (prefs().manageVaccinesInDoses)
      cols.push({
        c: {
          accessor: line =>
            line.item.isVaccine
              ? line.numberOfPacks * line.packSize * line.item.doses
              : '',
          id: 'doses',
        },
        header: t('label.doses'),
        ...getNumberCell(),
      });
    if (prefs().editPrescribedQuantity)
      cols.push({
        c: {
          accessor: line => line.prescribedQuantity ?? '',
          id: 'prescribedQuantity',
        },
        header: t('label.prescribed-quantity'),
        ...getNumberCell(),
      });
    cols.push(
      {
        c: { key: 'numberOfPacks' },
        header: t('label.pack-quantity'),
        ...getNumberCell(),
      },
      {
        c: {
          accessor: line => line.sellPricePerPack / (line.packSize || 1),
          id: 'unitPrice',
        },
        header: t('label.unit-price'),
        ...getCurrencyCell(),
      },
      {
        c: { key: 'totalAfterTax' },
        header: t('label.line-total'),
        ...getCurrencyCell(),
      },
      {
        c: {
          accessor: line => line.costPricePerPack * line.numberOfPacks,
          id: 'costPrice',
        },
        header: t('label.purchase-cost-price'),
        ...getCurrencyCell(),
      }
    );
    return cols;
  };

  const crumbs = (node?: PrescriptionFieldsFragment) => [
    { label: t('dispensary') },
    {
      label: t('prescriptions'),
      to: `/${params.storeId}/dispensary/prescription`,
    },
    { label: node ? `${node.invoiceNumber}` : '…' },
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
                  {/* Add item — hidden once read-only (D39). */}
                  <Show when={!disabled()}>
                    <Button
                      icon={<PlusCircleIcon />}
                      data-testid="add-item-button"
                      onClick={() => setEditState({})}
                    >
                      {t('button.add-item')}
                    </Button>
                  </Show>
                  {/* Print: labels primary, the report selector as the
                      option — both at every status (AC-E1/E2). */}
                  <SplitButton
                    icon={<PrinterIcon />}
                    testId="print-button"
                    options={[
                      {
                        value: 'labels',
                        label: t('button.print-prescription-label'),
                      },
                      {
                        value: 'report',
                        label: t('button.export-or-print'),
                      },
                    ]}
                    defaultValue="labels"
                    onAction={value =>
                      value === 'labels'
                        ? void runPrintLabels()
                        : setReportOpen(true)
                    }
                  />
                  <Button
                    variant="secondary"
                    icon={<InfoIcon />}
                    data-testid="history-button"
                    onClick={() => setHistoryOpen(true)}
                  >
                    {t('button.history')}
                  </Button>
                  <Show when={!sidePanelOpen()}>
                    <Button
                      variant="secondary"
                      icon={<SidebarIcon />}
                      data-testid="open-detail-panel-button"
                      onClick={() => setSidePanelOpen(true)}
                    >
                      {t('button.more')}
                    </Button>
                  </Show>
                </HeaderButtons>
                <Toolbar>
                  <PrescriptionToolbar
                    storeId={params.storeId}
                    node={node()}
                    disabled={disabled()}
                    onSave={input => void saveField(input)}
                    onClearLinesAndSave={input => void clearLinesAndSave(input)}
                  />
                </Toolbar>
                <TabList tabs={tabs()} />
              </Header>
            }
            sidePanelOpen={sidePanelOpen()}
            sidePanelTitle={t('heading.additional-info')}
            onSidePanelClose={() => setSidePanelOpen(false)}
            sidePanelContent={
              <PrescriptionSidePanel
                storeId={params.storeId}
                node={node()}
                disabled={disabled()}
                edit={edit}
                hasInsuranceProviders={hasInsuranceProviders()}
                patientPolicyCount={
                  policiesData.state === 'ready' ||
                  policiesData.state === 'refreshing'
                    ? policiesData.latest
                    : undefined
                }
                canCancelPermission={hasPermission('CANCEL_FINALISED_INVOICES')}
                onSave={input => void saveField(input)}
                onCancel={() =>
                  void savePrescription(params.storeId, {
                    id: node().id,
                    status: 'CANCELLED',
                  }).then(outcome => {
                    if (outcome.kind === 'saved')
                      mutate(prev =>
                        prev ? { ...prev, ...outcome.node } : prev
                      );
                  })
                }
                onDeleted={() =>
                  navigate(`/${params.storeId}/dispensary/prescription`, {
                    replace: true,
                  })
                }
              />
            }
            contentFooter={
              <Show
                when={selectedIds().length > 0}
                fallback={
                  <PrescriptionStatusFooter
                    storeId={params.storeId}
                    node={node()}
                    hasInsuranceProviders={hasInsuranceProviders()}
                    onSaved={saved =>
                      mutate(prev => (prev ? { ...prev, ...saved } : prev))
                    }
                    onClose={() =>
                      navigate(`/${params.storeId}/dispensary/prescription`)
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
                  <Button
                    variant="secondary"
                    icon={<PrinterIcon />}
                    loading={printingLabels()}
                    onClick={() => void runPrintLabels(selectedIds())}
                  >
                    {t('button.print-prescription-label')}
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
                      icon={<PlusCircleIcon />}
                      data-testid="nothing-here-create-button"
                      onClick={() => setEditState({})}
                    >
                      {t('button.add-item')}
                    </Button>
                  </Show>
                }
                enableSelection
                selectedIds={selectedIds()}
                onSelectionChange={setSelectedIds}
                config={tableConfig.config()}
                setConfig={tableConfig.setConfig}
              />
            </TabPanel>
            <TabPanel value="custom-fields">
              <CustomFieldsEditTab
                scope="prescription"
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

          {/* The S4 line editor (D53) — mounted fresh per open. */}
          <Show when={editState()} keyed>
            {state => (
              <PrescriptionLineEditModal
                storeId={params.storeId}
                invoiceId={node().id}
                initialItemId={state.itemId}
                initialItem={state.item}
                existingItemIds={existingItemIds()}
                onClose={() => setEditState(undefined)}
                onSaved={() => void refetch()}
              />
            )}
          </Show>

          <Show when={historyOpen()}>
            <HistoryModal
              storeId={params.storeId}
              patientId={node().patient?.id ?? ''}
              excludeInvoiceId={node().id}
              onClose={() => setHistoryOpen(false)}
            />
          </Show>

          <Show when={reportOpen()}>
            <SelectReportModal
              context="PRESCRIPTION"
              dataId={node().id}
              onClose={() => setReportOpen(false)}
            />
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
            onConfirm={() => void runDeleteLines()}
          />

          {/* Label printer not configured (AC-E2). */}
          <Dialog
            open={printerMissing()}
            onClose={() => setPrinterMissing(false)}
            title={t('heading.unable-to-print')}
            actions={
              <Button
                data-testid="dialog-button-ok"
                onClick={() => setPrinterMissing(false)}
              >
                {t('button.ok')}
              </Button>
            }
          >
            <Alert severity="warning">
              {t('error.label-printer-not-configured')}
            </Alert>
          </Dialog>
        </Tabs>
      )}
    </Show>
  );
};

export default PrescriptionDetailView;
