import { createResource } from 'solid-js';
import type { Component } from 'solid-js';
import { useNavigate, useParams } from '@solidjs/router';
import { graphqlFetch } from '../../../api/graphql';
import { t } from '../../../intl';
import { createTableConfig } from '../../../api/createTableConfig';
import { DataTable, type Column } from '../../../ui/elements/table/DataTable';
import {
  getCellDefinition,
  getNumberCell,
  getTextCell,
} from '../../../ui/elements/table/tableHelpers';
import { remToPx } from '../../../ui/utils/rem';
import { SupplierPurchaseOrders } from '../names.generated';
import type { SupplierPurchaseOrdersResult } from '../names.generated';
import { purchaseOrderAreaPath } from '../list/namesListLogic';
import { poStatusLabel } from './purchaseOrderStatus';

// S4 Purchase orders tab — a read-only reference list of the supplier's purchase
// orders (AC-N26). The DATA is owned by the purchase-order vertical (contract ›
// record detail: cross-vertical, named not owned); this tab only lists them, and
// selecting a row opens the purchase-order area. The PO vertical isn't built in
// this scope, so a row navigates to the PO area landing (deep-link to a specific
// PO awaits that vertical — see BUILD_REPORT). It is the standard data table
// (with its view-control toolbar), matching the list views (spec/ui-standards/
// detail-views › tabs).

type PoRow = SupplierPurchaseOrdersResult['purchaseOrders']['nodes'][number];

export const PurchaseOrdersTab: Component<{ supplierName: string }> = props => {
  const params = useParams<{ storeId: string }>();
  const navigate = useNavigate();
  const tableConfig = createTableConfig({
    tableId: 'names-supplier-purchase-orders',
  });

  const [data] = createResource(
    () => props.supplierName,
    async supplierName => {
      const result = await graphqlFetch(SupplierPurchaseOrders, {
        storeId: params.storeId,
        supplierName,
      });
      if (result.kind !== 'success') return [];
      return result.data.purchaseOrders.nodes;
    }
  );

  // Non-suspending read (opened on interaction — see the reactivity note in
  // domain/customFields CustomFieldsView / kdd/solid-reactivity-pitfalls).
  const rows = (): PoRow[] =>
    data.state === 'ready' || data.state === 'refreshing'
      ? (data.latest ?? [])
      : [];

  // Cell types + widths per docs/CELL_TYPES.md: the date and comment columns
  // take their key's preset; the PO number, target months, lines count and
  // status have no CELL_DEF key, so they keep the explicit helper and set the
  // width at the call site (sized to their header, the binding constraint).
  const columns = (): Column<PoRow, never>[] => [
    {
      c: { key: 'number' },
      header: () => t('label.number'),
      ...getNumberCell(),
      size: remToPx(4.5),
    },
    {
      c: { key: 'createdDatetime' },
      header: () => t('label.created'),
      ...getCellDefinition('createdDatetime'),
    },
    {
      c: { key: 'confirmedDatetime' },
      header: () => t('label.confirmed'),
      ...getCellDefinition('confirmedDatetime'),
    },
    {
      c: { accessor: row => poStatusLabel(row.status), id: 'status' },
      header: () => t('label.status'),
      // The status-chip cell preset isn't built (CELL_TYPES.md § Status), so
      // this is the translated label as text at the width that preset reserves.
      ...getTextCell(),
      size: remToPx(7.5),
    },
    {
      c: { key: 'targetMonths' },
      header: () => t('label.target-months'),
      ...getNumberCell(),
      size: remToPx(8),
    },
    {
      c: { accessor: row => row.lines.totalCount, id: 'lines' },
      header: () => t('label.lines'),
      ...getNumberCell(),
      size: remToPx(4.5),
    },
    {
      c: { key: 'comment' },
      header: () => t('label.comment'),
      // The comment cell: icon + popover, blank when empty — the house
      // treatment for a comment column.
      ...getCellDefinition('comment'),
    },
  ];

  return (
    <DataTable
      columns={columns()}
      rows={rows()}
      rowKey={r => r.id}
      loading={data.loading}
      emptyMessage={t('name.po.empty')}
      config={tableConfig.config()}
      setConfig={tableConfig.setConfig}
      configIsDefault={tableConfig.isConfigDefault()}
      onSaveGlobalDefault={
        tableConfig.canSaveGlobalDefault()
          ? tableConfig.saveGlobalTableConfig
          : undefined
      }
      // Selecting a purchase order opens it in the purchase-order area (AC-N26).
      onRowClick={() => navigate(purchaseOrderAreaPath(params.storeId))}
    />
  );
};
