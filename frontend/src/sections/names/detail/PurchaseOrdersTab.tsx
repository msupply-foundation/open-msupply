import { createResource } from 'solid-js';
import type { Component } from 'solid-js';
import { useNavigate, useParams } from '@solidjs/router';
import { graphqlFetch } from '../../../api/graphql';
import { t } from '../../../intl';
import { localisedDate } from '../../../intl/formatDateTime';
import { DataTable, type Column } from '../../../ui/elements/table/DataTable';
import { getNumberCell } from '../../../ui/elements/table/tableHelpers';
import { SupplierPurchaseOrders } from '../names.generated';
import type { SupplierPurchaseOrdersResult } from '../names.generated';
import { purchaseOrderAreaPath } from '../list/namesListLogic';

// S4 Purchase orders tab — a read-only reference list of the supplier's purchase
// orders (AC-N26). The DATA is owned by the purchase-order vertical (contract ›
// record detail: cross-vertical, named not owned); this tab only lists them, and
// selecting a row opens the purchase-order area. The PO vertical isn't built in
// this scope, so a row navigates to the PO area landing (deep-link to a specific
// PO awaits that vertical — see BUILD_REPORT).

type PoRow = SupplierPurchaseOrdersResult['purchaseOrders']['nodes'][number];

export const PurchaseOrdersTab: Component<{ supplierName: string }> = props => {
  const params = useParams<{ storeId: string }>();
  const navigate = useNavigate();

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

  const columns = (): Column<PoRow, never>[] => [
    { c: { key: 'number' }, header: t('name.po.number'), ...getNumberCell() },
    { c: { key: 'status' }, header: t('name.po.status') },
    {
      c: { key: 'createdDatetime' },
      header: t('name.po.created'),
      cell: info => localisedDate(info.row.original.createdDatetime),
    },
    {
      c: { key: 'orderTotalAfterDiscount' },
      header: t('name.po.total'),
      ...getNumberCell(),
    },
  ];

  return (
    <DataTable
      columns={columns()}
      rows={data.latest ?? []}
      rowKey={r => r.id}
      loading={data.loading}
      emptyMessage={t('name.po.empty')}
      showFullScreen={false}
      // Selecting a purchase order opens it in the purchase-order area (AC-N26).
      onRowClick={() => navigate(purchaseOrderAreaPath(params.storeId))}
    />
  );
};
