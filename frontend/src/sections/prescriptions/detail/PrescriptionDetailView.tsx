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
import { HeaderToolbar } from '../../../ui/layout/Header/HeaderToolbar';
import { ContentFooter } from '../../../ui/layout/ContentFooter/ContentFooter';
import { ContentFooterActions } from '../../../ui/layout/ContentFooter/ContentFooterActions';
import { Button } from '../../../ui/elements/buttons/Button';
import { SplitButton } from '../../../ui/elements/buttons/SplitButton';
import { Dialog } from '../../../ui/elements/feedback/Dialog';
import { Alert } from '../../../ui/elements/feedback/Alert';
import { ErrorDetails } from '../../../ui/elements/feedback/ErrorDetails';
import { ConfirmDialog } from '../../../ui/elements/feedback/ConfirmDialog';
import { Spinner } from '../../../ui/elements/feedback/Spinner';
import { DataTable, type Column } from '../../../ui/elements/table/DataTable';
import {
  CommentHeader,
  getCellDefinition,
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
import { createAction, createAddAction } from '../../../ui/utils/keyActions';
import { ALT_L, ALT_M, ALT_N } from '../../../ui/utils/shortcuts';
import {
  AlertCircleIcon,
  CheckIcon,
  CloseIcon,
  InfoIcon,
  PlusCircleIcon,
  PrinterIcon,
  SidebarIcon,
  TrashIcon,
} from '../../../ui/icons';
import { createFlash } from '../../../ui/utils/createFlash';
import { createDebouncedEdit } from '../../../domain/debouncedEdit';
import { ActivityLogPanel } from '../../../domain/activityLog';
import { CustomFieldsEditTab } from '../../../domain/customFields';
import { SelectReportModal } from '../../../domain/reports';
import {
  hasPermission,
  prescriptionPreferences,
} from '../../../store/storeContext';
import { storeNameOf } from '../../../auth/authContext';
import {
  asPrescriptionStatus,
  isReadOnly,
  isPlaceholderLine,
  isRenderableLine,
} from '../prescriptionStatus';
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
import { PrescriptionLineViewModal } from './PrescriptionLineViewModal';
import { EditPatientModal } from '../../patients';

// The prescription detail (spec/prescriptions/ui-surface.md S3): toolbar
// (patient / clinician / date / program), Details + Log tabs over the flat
// line table (a row per dispensed line, plus a prescribed-quantity
// placeholder row where an item has nothing dispensed — AC-Q1/V1),
// the side panel, and the status footer. Dispensing happens in the S4 modal
// (D53). Read-only from VERIFIED: dead affordances are hidden (D39) and a row
// selection opens S4's read-only face rather than its editor (.73).

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
  // S4's read-only face (.73) — the item it's open for; undefined = closed.
  const [viewItemId, setViewItemId] = createSignal<string>();
  // The patient picker's edit-patient modal (#1038) — the id it's currently
  // open for; undefined = closed. Mounted fresh per open (below), like
  // editState's line editor.
  const [editPatientId, setEditPatientId] = createSignal<string>();
  const [historyOpen, setHistoryOpen] = createSignal(false);
  const [reportOpen, setReportOpen] = createSignal(false);
  const [deleteLinesConfirm, setDeleteLinesConfirm] = createSignal(false);
  const [printerMissing, setPrinterMissing] = createSignal(false);
  const [printingLabels, setPrintingLabels] = createSignal(false);
  // The print outcome reported ON the control that started it (D73 — a label
  // leaves the app, so nothing on screen would otherwise distinguish printed
  // from not). Both print controls can be on screen at once, so the flash
  // carries which one to label: the app bar's must not report an outcome the
  // bulk bar's button earned. It reverts on its own timer; the failure detail
  // is held separately so its dialog stays open until the user closes it.
  type PrintSource = 'header' | 'bulk';
  const printFlash = createFlash<{
    source: PrintSource;
    outcome: 'done' | 'failed';
  }>();
  const [printError, setPrintError] = createSignal<string>();

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

  // The rendered rows — dispensed lines, a cancellation reversal's returned
  // lines, and the prescribed-quantity placeholder (isRenderableLine);
  // ordered by item then batch for a stable read.
  const rows = createMemo((): Line[] =>
    (info()?.lines.nodes ?? [])
      .filter(isRenderableLine)
      .slice()
      .sort(
        (a, b) =>
          a.itemName.localeCompare(b.itemName) ||
          (a.batch ?? '').localeCompare(b.batch ?? '')
      )
  );

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
  // from the bulk bar. The endpoint's answer is reported either way (.64): the
  // printer is off-screen hardware, so a rejected print reaches the user only
  // through this control.
  const runPrintLabels = async (source: PrintSource, lineIds?: string[]) => {
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
      const outcome = await printLabels(
        buildLabels(node, storeNameOf(params.storeId), lines)
      );
      if (outcome.ok) {
        printFlash.show({ source, outcome: 'done' });
        return;
      }
      printFlash.show({ source, outcome: 'failed' });
      setPrintError(outcome.detail);
    } finally {
      setPrintingLabels(false);
    }
  };

  // Alt+N — this screen's add action (spec/keyboard KB-R2, AC-KB7). One
  // declaration for the header button and the ghost button in the table's empty
  // slot; each carries `shortcut={ALT_N}` for its badge. `info()` is the
  // `.state`-gated read above, so this predicate never suspends the palette
  // (kdd/keyboard-layer § an action's `disabled` MUST NOT read a suspending
  // source).
  createAddAction({
    name: 'button.add-item',
    run: () => setEditState({}),
    disabled: () => !info() || disabled(),
  });

  // Alt+L — print prescription labels (KB-R1's binding table, ui-surface S2). A
  // SPECIFIC action, gated on this screen because this is the only place it
  // exists (KB-R2's contrast). Available at every status (AC-E2); inert while a
  // print is already in flight, mirroring the footer control's `loading`. Runs
  // the HEADER control's print, which is the control that advertises the badge.
  createAction({
    name: 'button.print-prescription-label',
    shortcut: ALT_L,
    run: () => void runPrintLabels('header'),
    disabled: () => !info() || printingLabels(),
  });

  // What a given print control is reporting — nothing unless it was the one
  // pressed. Resting (undefined) leaves each control its own label and icon.
  const printOutcomeOf = (source: PrintSource) => {
    const flash = printFlash.value();
    return flash?.source === source ? flash.outcome : undefined;
  };
  const printIcon = (outcome?: 'done' | 'failed') =>
    outcome === 'done' ? (
      <CheckIcon />
    ) : outcome === 'failed' ? (
      <AlertCircleIcon />
    ) : (
      <PrinterIcon />
    );
  const printText = (outcome?: 'done' | 'failed') =>
    outcome === 'done'
      ? t('message.print-success')
      : outcome === 'failed'
        ? t('message.print-failed')
        : undefined;

  // Row selection opens S4 for the row's item — the editor while editable
  // (.55), its read-only face once it isn't (.73). Never a navigation away:
  // what the reader wants is the directions the item was dispensed with, and
  // they live on the line.
  const openRow = (line: Line) => {
    if (disabled()) setViewItemId(line.itemId);
    else
      setEditState({
        itemId: line.itemId,
        item: { id: line.itemId, code: line.itemCode, name: line.itemName },
      });
  };

  // The read-only face reads off the lines already loaded, so it needs only
  // the item — EVERY line of it, placeholders included (the prescribed quantity
  // and the directions may sit on one; see ./lineView).
  const viewLines = createMemo((): Line[] => {
    const itemId = viewItemId();
    if (itemId == null) return [];
    return (info()?.lines.nodes ?? []).filter(line => line.itemId === itemId);
  });

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
        header: () => <CommentHeader />,
        ...getCellDefinition('comment'),
      },
      { c: { key: 'itemCode' }, header: () => t('label.code') },
      {
        c: { key: 'itemName' },
        header: () => t('label.name'),
        meta: { headerPosition: 'primary' },
      },
      { c: { key: 'batch' }, header: () => t('label.batch') },
      {
        c: { key: 'expiryDate' },
        header: () => t('label.expiry-date'),
        ...getExpiryDateCell(),
      },
      { c: { key: 'locationName' }, header: () => t('label.location') },
      {
        c: { accessor: line => line.item.unitName ?? '', id: 'unitName' },
        header: () => t('label.unit-name'),
      },
      {
        c: { key: 'packSize' },
        header: () => t('label.pack-size'),
        ...getNumberCell(),
      },
    ];
    if (prefs().manageVaccinesInDoses)
      cols.push({
        c: {
          accessor: line => (line.item.isVaccine ? line.item.doses : ''),
          id: 'dosesPerUnit',
        },
        header: () => t('label.doses-per-unit'),
        ...getNumberCell(),
      });
    cols.push({
      c: {
        accessor: line => line.numberOfPacks * line.packSize,
        id: 'unitQuantity',
      },
      header: () => t('label.unit-quantity'),
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
        header: () => t('label.doses'),
        ...getNumberCell(),
      });
    if (prefs().editPrescribedQuantity)
      cols.push({
        c: {
          accessor: line => line.prescribedQuantity ?? '',
          id: 'prescribedQuantity',
        },
        header: () => t('label.prescribed-quantity'),
        ...getNumberCell(),
      });
    cols.push(
      {
        c: { key: 'numberOfPacks' },
        header: () => t('label.pack-quantity'),
        ...getNumberCell(),
      },
      // The money columns stay EMPTY on a placeholder row: it holds no
      // stock and no packs, so a price would be a fabricated $0.00 (the
      // current app blanks them the same way).
      {
        c: {
          accessor: line =>
            isPlaceholderLine(line)
              ? null
              : line.sellPricePerPack / (line.packSize || 1),
          id: 'unitPrice',
        },
        header: () => t('label.unit-price'),
        ...getCurrencyCell(),
      },
      {
        c: {
          accessor: line => (isPlaceholderLine(line) ? null : line.totalAfterTax),
          id: 'totalAfterTax',
        },
        header: () => t('label.line-total'),
        ...getCurrencyCell(),
      },
      {
        c: {
          accessor: line =>
            isPlaceholderLine(line)
              ? null
              : line.costPricePerPack * line.numberOfPacks,
          id: 'costPrice',
        },
        header: () => t('label.purchase-cost-price'),
        ...getCurrencyCell(),
      }
    );
    return cols;
  };

  const crumbs = (node?: PrescriptionFieldsFragment) => [
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
                      shortcut={ALT_N}
                      data-testid="add-item-button"
                      onClick={() => setEditState({})}
                    >
                      {t('button.add-item')}
                    </Button>
                  </Show>
                  {/* Print: labels primary, the report selector as the
                      option — both at every status (AC-E1/E2). Labels report
                      their outcome here (.64): busy, then printed / failed. */}
                  <SplitButton
                    icon={printIcon(printOutcomeOf('header'))}
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
                    loading={printingLabels()}
                    mainLabel={printText(printOutcomeOf('header'))}
                    // Alt+L is registered above and runs the labels action; it
                    // lands on this control's MAIN half, whose default option is
                    // labels (ui-surface S2).
                    shortcut={ALT_L}
                    onAction={value => {
                      if (value === 'labels')
                        return void runPrintLabels('header');
                      // Picking an option also re-targets the main button, so a
                      // lingering "Printed" would now label Export or print —
                      // drop it (createFlash § clear).
                      printFlash.clear();
                      setReportOpen(true);
                    }}
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
                      // createSidePanelOpen registers Alt+M; this is the
                      // control that advertises it (ui-surface S2).
                      shortcut={ALT_M}
                      onClick={() => setSidePanelOpen(true)}
                    >
                      {t('button.more')}
                    </Button>
                  </Show>
                </HeaderButtons>
                {/* The header field cluster — never a hand-rolled <Toolbar>
                    (ui/docs/PAGES.md § header field cluster). */}
                <HeaderToolbar>
                  <PrescriptionToolbar
                    storeId={params.storeId}
                    node={node()}
                    disabled={disabled()}
                    onSave={input => void saveField(input)}
                    onClearLinesAndSave={clearLinesAndSave}
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
                    icon={printIcon(printOutcomeOf('bulk'))}
                    loading={printingLabels()}
                    data-testid="print-labels-button"
                    onClick={() => void runPrintLabels('bulk', selectedIds())}
                  >
                    {printText(printOutcomeOf('bulk')) ??
                      t('button.print-prescription-label')}
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
                // The placeholder is a line awaiting an action — nothing is
                // dispensed for the item yet (its own cells say so: no batch,
                // zero packs, a prescribed quantity).
                rowTone={line => (isPlaceholderLine(line) ? 'info' : undefined)}
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
                enableSelection
                selectedIds={selectedIds()}
                onSelectionChange={setSelectedIds}
                config={tableConfig.config()}
                setConfig={tableConfig.setConfig}
                // Central-server admins can promote this table's layout to the
                // shared install-wide default, the same as the list (issue
                // #1118 — detail tables offered no way to save table
                // defaults). Gate + action both off the config controller;
                // undefined for everyone else, so the action isn't offered.
                onSaveGlobalDefault={
                  tableConfig.canSaveGlobalDefault()
                    ? tableConfig.saveGlobalTableConfig
                    : undefined
                }
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
                programId={node().programId ?? undefined}
                onClose={() => setEditState(undefined)}
                onSaved={() => void refetch()}
              />
            )}
          </Show>

          {/* S4's read-only face (.73) — the same surface the editor above
              occupies while the prescription is editable, opened by a row
              selection once it isn't. */}
          <Show when={viewLines().length > 0}>
            <PrescriptionLineViewModal
              lines={viewLines()}
              onClose={() => setViewItemId(undefined)}
            />
          </Show>

          {/* The patient picker's edit-patient modal (spec/patients S4,
              #1038) — in place over this screen, never a navigate-away;
              mounted fresh per open like the line editor above. A save
              refetches so the toolbar/side panel show the patient's current
              name. */}
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
            confirmVariant="danger"
            onConfirm={() => void runDeleteLines()}
          />

          {/* Label printer not configured (AC-E2). */}
          <Dialog
            open={printerMissing()}
            onClose={() => setPrinterMissing(false)}
            title={t('heading.unable-to-print')}
            actions={
              <Button
                confirms="plain"
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

          {/* The print was attempted and the server refused it (.64). Distinct
              from the notice above: that one is a configuration warning caught
              before any request, this carries the endpoint's own message — its
              plain-text body, the only detail there is. */}
          <Show when={printError()}>
            {detail => (
              <Dialog
                open
                onClose={() => setPrintError(undefined)}
                icon={<AlertCircleIcon />}
                testId="print-error-modal"
                title={t('heading.unable-to-print')}
                actions={
                  <Button
                    variant="secondary"
                    data-testid="print-error-modal-close"
                    onClick={() => setPrintError(undefined)}
                  >
                    {t('button.close')}
                  </Button>
                }
              >
                <Alert severity="error">
                  {t('error.printing-label')}
                  <ErrorDetails detail={detail()} />
                </Alert>
              </Dialog>
            )}
          </Show>
        </Tabs>
      )}
    </Show>
  );
};

export default PrescriptionDetailView;
