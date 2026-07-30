import {
  createMemo,
  createResource,
  createSignal,
  Show,
  Suspense,
} from 'solid-js';
import type { Component } from 'solid-js';
import { useNavigate, useParams } from '@solidjs/router';
import { graphqlFetch } from '../../../api/graphql';
import { t } from '../../../intl';
import { Page } from '../../../ui/layout/Page/Page';
import { Header } from '../../../ui/layout/Header/Header';
import { Breadcrumb } from '../../../ui/layout/Header/Breadcrumb';
import { HeaderButtons } from '../../../ui/layout/Header/HeaderButtons';
import { Toolbar } from '../../../ui/layout/Header/Toolbar';
import { Button } from '../../../ui/elements/buttons/Button';
import { Spinner } from '../../../ui/elements/feedback/Spinner';
import { Dialog } from '../../../ui/elements/feedback/Dialog';
import { Tabs, TabList, TabPanel } from '../../../ui/elements/tabs/Tabs';
import { CheckIcon, InfoIcon, PlusCircleIcon } from '../../../ui/icons';
import { DataTable, type Column } from '../../../ui/elements/table/DataTable';
import {
  getCurrencyCell,
  getDateCell,
  getNumberCell,
} from '../../../ui/elements/table/tableHelpers';
import { createTableConfig } from '../../../api/createTableConfig';
import { createDebouncedEdit } from '../../../domain/debouncedEdit';
import {
  CustomFieldsEditTab,
  CustomFieldsToolbar,
} from '../../../domain/customFields';
import {
  SupplierReturnDetail,
  type SupplierReturnInfoFragment,
  type SupplierReturnLineFragment,
  type UpdateSupplierReturnVariables,
} from './supplierReturnDetail.generated';
import { SupplierReturnPreferences } from '../preferences.generated';
import { SupplierReturnToolbar } from './SupplierReturnToolbar';
import { SupplierReturnSidePanel } from './SupplierReturnSidePanel';
import { SupplierReturnStatusFooter } from './SupplierReturnStatusFooter';
import { LogTab } from './LogTab';
import {
  ReturnItemsModal,
  type ReturnItem,
  type ReturnLinesSaved,
} from './edit-modal/ReturnItemsModal';
import { isReturnDisabled } from './returnStatus';
import { changeSupplier, saveReturnFields } from './returnUpdate';
import type { ReturnEditFields } from './returnEdit';
import { ExportPrintAction } from './actions/ExportPrintAction';

// The supplier-return detail view (spec/supplier-returns/ui-surface.md S3):
// toolbar (supplier lookup / reference / prominent custom fields), Details |
// Custom fields | Log tabs, the read-only cost-valued line table (row click →
// the return-items modal), the Additional-info side panel, and the status
// footer (hold / lifecycle / close / advance). Every edit affordance shares the
// one editability gate (rules § editability): a SHIPPED return is read-only.

type Line = SupplierReturnLineFragment;

const SupplierReturnDetailView: Component = () => {
  const params = useParams<{ storeId: string; returnId: string }>();
  const navigate = useNavigate();
  const [sidePanelOpen, setSidePanelOpen] = createSignal(false);
  const [supplierError, setSupplierError] = createSignal<string | undefined>();

  type EditState =
    { mode: 'update'; itemId: string } | { mode: 'add' } | undefined;
  const [editState, setEditState] = createSignal<EditState>();

  const tableConfig = createTableConfig({ tableId: 'supplier-return-detail' });

  // Fetch the return. A non-return / bad id resolves to undefined — the
  // not-found deep-link alert renders below (ui-surface S3 § tabs). The
  // resource IS the local state: every save writes back with `mutate`
  // (kdd/state-management).
  const [data, { mutate }] = createResource(
    () => ({ storeId: params.storeId, id: params.returnId }),
    async variables => {
      const result = await graphqlFetch(SupplierReturnDetail, variables);
      if (result.kind !== 'success') return undefined;
      return result.data.invoice.__typename === 'InvoiceNode'
        ? result.data.invoice
        : undefined;
    }
  );

  const info = (): SupplierReturnInfoFragment | undefined => data();
  const rows = (): Line[] => data()?.lines.nodes ?? [];
  const hasLines = () => rows().length > 0;

  // The store preferences the status controls key off (rules § preference
  // gates). `.latest` — read at the screen's initial load (no live state yet);
  // empty = no restriction while loading.
  const [prefs] = createResource(
    () => params.storeId,
    async storeId => {
      const result = await graphqlFetch(SupplierReturnPreferences, { storeId });
      if (result.kind !== 'success') return undefined;
      return result.data.preferences;
    }
  );
  const statusOptions = () => prefs.latest?.invoiceStatusOptions ?? [];

  // --- Return-level saves (updateSupplierReturn, spliced back, no refetch) ---

  const saveField = async (
    patch: Partial<Omit<UpdateSupplierReturnVariables['input'], 'id'>>
  ) => {
    const node = data();
    if (!node) return;
    const result = await saveReturnFields(params.storeId, {
      id: node.id,
      ...patch,
    });
    if (result.kind === 'saved') {
      const saved = result.node;
      mutate(prev => (prev ? { ...prev, ...saved } : prev));
    }
    return result;
  };

  // ONE debounced buffer for the as-you-type fields (toolbar reference + side
  // panel comment + transport reference) — a burst across them coalesces into
  // one save.
  const edit = createDebouncedEdit<ReturnEditFields>({
    id: () => data()?.id ?? '',
    initial: () => ({
      theirReference: data()?.theirReference ?? '',
      comment: data()?.comment ?? '',
      transportReference: data()?.transportReference ?? '',
    }),
    save: patch => void saveField(patch),
  });

  const setHold = (hold: boolean) => void saveField({ onHold: hold });
  const setColour = (colour: string) => void saveField({ colour });

  const saveCustomFields = async (
    patch: Record<string, unknown>
  ): Promise<boolean> => {
    const result = await saveField({ customFields: patch });
    return result?.kind === 'saved';
  };

  // Changing the supplier is a SEPARATE, delete-and-recreate mutation (rules §
  // header rules): success returns a NEW node under a NEW id, so navigate to
  // it; its typed rejections surface inline on the supplier lookup.
  const onChangeSupplier = async (supplierId: string) => {
    setSupplierError(undefined);
    const node = data();
    if (!node) return;
    const result = await changeSupplier(params.storeId, {
      id: node.id,
      otherPartyId: supplierId,
    });
    if (result.kind === 'saved')
      navigate(
        `/${params.storeId}/replenishment/supplier-return/${result.node.id}`
      );
    else if (result.kind === 'error') setSupplierError(result.message);
  };

  // A line save returns the whole invoice with its refreshed line set — replace
  // the node wholesale (no splicing needed).
  const onLinesSaved = (node: ReturnLinesSaved) => mutate(() => node);

  const onAdvanced = (saved: SupplierReturnInfoFragment) =>
    mutate(prev => (prev ? { ...prev, ...saved } : prev));

  // --- The return-items modal's item plumbing ---

  const itemById = (id: string): ReturnItem | undefined => {
    const line = rows().find(l => l.item.id === id);
    return line ? { id, code: line.item.code, name: line.itemName } : undefined;
  };

  // The distinct item AFTER currentId in the current row order ("Save & next").
  const nextItem = (currentId: string): ReturnItem | undefined => {
    const seen = new Set<string>();
    let past = false;
    for (const line of rows()) {
      const id = line.item.id;
      if (id === currentId) {
        past = true;
        seen.add(id);
        continue;
      }
      if (past && !seen.has(id))
        return { id, code: line.item.code, name: line.itemName };
      seen.add(id);
    }
    return undefined;
  };

  const existingItemIds = (): string[] => [
    ...new Set(rows().map(line => line.item.id)),
  ];
  const existingLineIds = (): ReadonlySet<string> =>
    new Set(rows().map(line => line.id));

  const openRow = (line: Line) =>
    setEditState({ mode: 'update', itemId: line.item.id });
  const openAdd = () => setEditState({ mode: 'add' });

  const crumbs = (node: SupplierReturnInfoFragment) => [
    { label: t('replenishment') },
    {
      label: t('supplier-return'),
      onClick: () =>
        navigate(`/${params.storeId}/replenishment/supplier-return`),
    },
    { label: String(node.invoiceNumber) },
  ];

  // Line columns (ui-surface S3 § line table) — cost-valued, one row per stock
  // line (grouping is a DataTable gap; rendered flat, as customer returns).
  const columns = (): Column<Line, never>[] => [
    {
      c: { accessor: line => line.item.code, id: 'item.code' },
      header: () => t('label.code'),
    },
    {
      c: { key: 'itemName' },
      header: () => t('label.name'),
      meta: { headerPosition: 'primary', wrapLines: 2 },
    },
    {
      c: { key: 'batch' },
      header: () => t('label.batch'),
    },
    {
      c: { key: 'expiryDate' },
      header: () => t('label.expiry'),
      ...getDateCell(),
    },
    {
      c: { accessor: line => line.item.unitName ?? '', id: 'unitName' },
      header: () => t('label.unit'),
    },
    {
      c: { key: 'packSize' },
      header: () => t('label.pack-size'),
      ...getNumberCell(),
    },
    {
      c: { key: 'numberOfPacks' },
      header: () => t('label.num-packs'),
      ...getNumberCell(),
      meta: { headerPosition: 'badge' },
    },
    {
      c: {
        accessor: line => line.packSize * line.numberOfPacks,
        id: 'totalQuantity',
      },
      header: () => t('label.total-quantity'),
      ...getNumberCell(),
    },
    {
      c: { key: 'costPricePerPack' },
      header: () => t('label.pack-cost-price'),
      ...getCurrencyCell(),
    },
    {
      c: {
        accessor: line => line.costPricePerPack * line.numberOfPacks,
        id: 'lineTotal',
      },
      header: () => t('label.line-total'),
      ...getCurrencyCell(),
    },
  ];

  return (
    <Suspense fallback={<Spinner center />}>
      {/* NON-keyed Show (kdd/solid-reactivity-pitfalls): every save sets a
          fresh node object; keyed would remount the page and drop focus. The
          resolved-undefined fallback is the not-found deep-link alert. */}
      <Show
        when={info()}
        fallback={
          <Dialog
            open
            icon={<InfoIcon />}
            title={t('error.return-not-found')}
            description={t('messages.click-to-return-to-returns')}
            onClose={() =>
              navigate(`/${params.storeId}/replenishment/supplier-return`)
            }
            actions={
              <Button
                variant="secondary"
                icon={<CheckIcon />}
                onClick={() =>
                  navigate(`/${params.storeId}/replenishment/supplier-return`)
                }
              >
                {t('button.ok')}
              </Button>
            }
          />
        }
      >
        {node => {
          const disabled = createMemo(() => isReturnDisabled(node()));
          return (
            <Page
              fillBody
              sidePanelOpen={sidePanelOpen()}
              sidePanelTitle={t('heading.details')}
              onSidePanelClose={() => setSidePanelOpen(false)}
              sidePanelContent={
                <SupplierReturnSidePanel
                  node={node()}
                  disabled={disabled()}
                  edit={edit}
                  onSetColour={setColour}
                />
              }
              header={
                <Header>
                  <Breadcrumb crumbs={crumbs(node())} />
                  <HeaderButtons>
                    {/* Add item hides once the return is read-only (D39). */}
                    <Show when={!disabled()}>
                      <Button
                        icon={<PlusCircleIcon />}
                        data-testid="add-item-button"
                        onClick={openAdd}
                      >
                        {t('button.add-item')}
                      </Button>
                    </Show>
                    <ExportPrintAction returnId={node().id} />
                    <Show when={!sidePanelOpen()}>
                      <Button
                        variant="secondary"
                        icon={<InfoIcon />}
                        onClick={() => setSidePanelOpen(true)}
                      >
                        {t('button.more')}
                      </Button>
                    </Show>
                  </HeaderButtons>
                  <Toolbar>
                    <SupplierReturnToolbar
                      storeId={params.storeId}
                      node={node()}
                      disabled={disabled()}
                      edit={edit}
                      onChangeSupplier={id => void onChangeSupplier(id)}
                      supplierError={supplierError()}
                    />
                    {/* PROMINENT custom fields — stay in the toolbar even when
                        read-only, just disabled. */}
                    <CustomFieldsToolbar
                      scope="supplier_return"
                      recordId={node().id}
                      values={node().customFields}
                      disabled={disabled()}
                      onSave={patch => void saveField({ customFields: patch })}
                    />
                  </Toolbar>
                </Header>
              }
              contentFooter={
                <SupplierReturnStatusFooter
                  storeId={params.storeId}
                  node={node()}
                  disabled={disabled()}
                  hasLines={hasLines()}
                  statusOptions={statusOptions()}
                  onSetHold={setHold}
                  onAdvanced={onAdvanced}
                />
              }
            >
              {/* Details | Custom fields | Log (ui-surface S3 § tabs). */}
              <Tabs defaultValue="details">
                <TabList
                  tabs={[
                    { value: 'details', label: t('label.details') },
                    {
                      value: 'custom-fields',
                      label: t('label.custom-fields'),
                    },
                    { value: 'log', label: t('label.log') },
                  ]}
                />
                <TabPanel value="details">
                  <DataTable
                    columns={columns()}
                    rows={rows()}
                    rowKey={line => line.id}
                    loading={data.loading}
                    onRowClick={disabled() ? undefined : openRow}
                    emptyMessage={t('error.no-outbound-items')}
                    empty={
                      disabled() ? undefined : (
                        <Button
                          icon={<PlusCircleIcon />}
                          data-testid="nothing-here-create-button"
                          onClick={openAdd}
                        >
                          {t('button.add-item')}
                        </Button>
                      )
                    }
                    config={tableConfig.config()}
                    setConfig={tableConfig.setConfig}
                  />
                </TabPanel>
                <TabPanel value="custom-fields">
                  <CustomFieldsEditTab
                    scope="supplier_return"
                    promoteToToolbar
                    disabled={disabled()}
                    values={node().customFields}
                    onSave={saveCustomFields}
                  />
                </TabPanel>
                <TabPanel value="log">
                  <LogTab storeId={params.storeId} recordId={node().id} />
                </TabPanel>
              </Tabs>
              <ReturnItemsModal
                open={editState() != null}
                onClose={() => setEditState(undefined)}
                storeId={params.storeId}
                returnId={node().id}
                mode={editState()?.mode ?? 'update'}
                initialItemId={
                  editState()?.mode === 'update'
                    ? (editState() as { itemId: string }).itemId
                    : undefined
                }
                excludeItemIds={existingItemIds}
                nextItem={nextItem}
                itemById={itemById}
                onSaved={onLinesSaved}
                existingLineIds={existingLineIds}
                returnToName={node().otherPartyName}
                edit={edit}
              />
            </Page>
          );
        }}
      </Show>
    </Suspense>
  );
};

export default SupplierReturnDetailView;
