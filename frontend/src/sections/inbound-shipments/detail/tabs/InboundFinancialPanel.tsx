import { type Component } from 'solid-js';
import { t } from '../../../../intl';
import {
  DataTable,
  type Column,
} from '../../../../ui/elements/table/DataTable';
import {
  getCurrencyCell,
  getNumberCell,
} from '../../../../ui/elements/table/tableHelpers';
import type { InboundLineFragment } from '../inboundShipmentDetail.generated';

type Line = InboundLineFragment;

// The detail "Financial" tab (spec S3 tabs → Financial; PO-linked shipments
// only): per line — PO line number, pack quantity/size, unit, PO price per
// pack (foreign where applicable), sell price, and line total, with summed
// column footers (getCurrencyCell aggregates). Header-level capture; the finer
// PO-currency conversion detail isn't fully specced.
export const InboundFinancialPanel: Component<{ rows: Line[] }> = props => {
  const columns = (): Column<Line, never>[] => [
    {
      c: {
        accessor: line => line.purchaseOrderLine?.lineNumber ?? '',
        id: 'poLine',
      },
      header: t('label.po-line-number'),
      ...getNumberCell(),
    },
    {
      c: { accessor: line => line.itemName, id: 'itemName' },
      header: t('label.name'),
    },
    {
      c: { key: 'numberOfPacks' },
      header: t('label.pack-quantity'),
      ...getNumberCell(),
    },
    {
      c: { key: 'packSize' },
      header: t('label.pack-size'),
      ...getNumberCell(),
    },
    {
      c: { accessor: line => line.item.unitName ?? '', id: 'unit' },
      header: t('label.unit'),
    },
    {
      c: {
        accessor: line =>
          line.foreignCurrencyPriceBeforeTax ?? line.costPricePerPack,
        id: 'poPrice',
      },
      header: t('label.pack-cost-price'),
      ...getCurrencyCell(),
    },
    {
      c: { key: 'sellPricePerPack' },
      header: t('label.pack-sell-price'),
      ...getCurrencyCell(),
    },
    {
      c: { accessor: line => line.totalBeforeTax, id: 'total' },
      header: t('label.total'),
      ...getCurrencyCell(),
    },
  ];

  return (
    <DataTable
      columns={columns()}
      rows={props.rows}
      rowKey={line => line.id}
      emptyMessage={t('error.no-inbound-items')}
    />
  );
};
