import { type Component } from 'solid-js';
import { t } from '../../../../intl';
import { formatNumber } from '../../../../intl/formatNumber';
import { homeCurrency } from '../../../../intl/currency';
import {
  DataTable,
  type Column,
} from '../../../../ui/elements/table/DataTable';
import { getNumberCell } from '../../../../ui/elements/table/tableHelpers';
import { createTableConfig } from '../../../../api/createTableConfig';
import type {
  InboundInfoFragment,
  InboundLineFragment,
} from '../inboundShipmentDetail.generated';

type Line = InboundLineFragment;

// Money → always 2dp (spec: "all money rounded to 2dp"), locale-formatted, no
// symbol — each money column names its currency in its header instead (a
// single table mixes PO-currency and local columns, so a per-cell symbol would
// be ambiguous, and the shared currency-cell helper is pinned to one code).
const money = (value: number): string =>
  formatNumber(value, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Header label with its currency code appended, e.g. "Line total (EUR)".
const withCode = (label: string, code: string): string =>
  code ? `${label} (${code})` : label;

// The detail "Financial" tab (spec S3 tabs → Financial; contract → Financial &
// Delivery tab derivation). A read-only table over the shipment's lines,
// keeping per-pack prices and line totals as SEPARATE columns: a per-pack
// column is the price for ONE pack, never quantity × price — that
// multiplication is only in the line-total columns. Every money column names
// its currency in the header; the PO currency and the store's home (local)
// currency are distinct columns, and the PO-currency + local-cost columns
// appear only when the shipment is in a foreign currency.
//
// The three line-total columns carry summed footers; the Name column's footer
// holds the "Total" label. Rows are sorted by PO line number so a PO line's
// batches sit together (the spec calls for grouping by PO line; the shared
// DataTable renders no group-header rows yet, so adjacency is the current
// approximation).
export const InboundFinancialPanel: Component<{
  node: InboundInfoFragment;
  rows: Line[];
}> = props => {
  // Page-owned column config (order/sizing/visibility/view-mode), like the
  // Details line table — this is what surfaces the column-settings and
  // card-view controls in the table toolbar.
  const tableConfig = createTableConfig({
    tableId: 'inbound-shipment-financial',
  });

  const rate = () => props.node.currencyRate;
  // Foreign currency ⇔ the PO's currency differs from the store's home
  // currency (contract). The PO-currency + local-cost columns gate on it.
  const foreign = () => {
    const currency = props.node.purchaseOrder?.currency;
    return !!currency && !currency.isHomeCurrency;
  };
  const poCode = () => props.node.purchaseOrder?.currency?.code ?? '';
  const localCode = () => homeCurrency();

  // Per-line derivations (contract → Financial), pure over the line only —
  // PO-currency figures come straight off the PO line. The rate-dependent
  // conversions are built inside columns() from a captured rate (below).
  const poPricePerPack = (line: Line) =>
    line.purchaseOrderLine?.pricePerPackAfterDiscount ?? 0;
  const lineTotalPo = (line: Line) => poPricePerPack(line) * line.numberOfPacks;
  // Adjusted total uses the line's ACTUAL cost (post charge/rate cascade), not
  // the raw PO price.
  const adjustedTotalLocal = (line: Line) =>
    line.costPricePerPack * line.numberOfPacks;

  const sum = (fn: (line: Line) => number) =>
    props.rows.reduce((total, line) => total + fn(line), 0);

  const sortedRows = () =>
    [...props.rows].sort(
      (a, b) =>
        (a.purchaseOrderLine?.lineNumber ?? 0) -
        (b.purchaseOrderLine?.lineNumber ?? 0)
    );

  // A right-aligned money column: `id`/`header`, the per-row value, and an
  // optional summed-total footer (the three line-total columns carry one). The
  // `value`/`footerTotal` are plain over their inputs — columns() takes the
  // reactive dependency (rate, rows) and rebuilds, so the stored closures never
  // read a signal themselves (avoids the stale-closure reactivity trap).
  const moneyColumn = (
    id: string,
    header: string,
    value: (line: Line) => number,
    footerTotal?: number
  ): Column<Line, never> => ({
    c: { accessor: value, id },
    header,
    cell: info => money(info.getValue<number>()),
    ...(footerTotal !== undefined ? { footer: () => money(footerTotal) } : {}),
    ...getNumberCell(),
  });

  // The PO-currency and local-cost columns (poPrice, packCostPrice,
  // lineTotalPo) show only in a foreign currency — spread in conditionally.
  // Reading rate()/foreign()/rows here means columns() rebuilds when any of
  // them change; the per-column closures then close over plain values.
  const columns = (): Column<Line, never>[] => {
    const r = rate();
    const lineTotalLocal = (line: Line) => lineTotalPo(line) * r;
    return [
      {
        c: { accessor: line => line.itemName, id: 'itemName' },
        header: t('label.name'),
        footer: () => t('label.total'),
      },
      {
        c: {
          accessor: line => line.purchaseOrderLine?.lineNumber ?? '',
          id: 'poLine',
        },
        header: t('label.po-line-number'),
        ...getNumberCell(),
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
      ...(foreign()
        ? [
            moneyColumn(
              'poPrice',
              withCode(t('label.po-price-per-pack'), poCode()),
              poPricePerPack
            ),
            moneyColumn(
              'packCostPrice',
              withCode(t('label.pack-cost-price'), localCode()),
              line => poPricePerPack(line) * r
            ),
          ]
        : []),
      moneyColumn(
        'sellPrice',
        withCode(t('label.pack-sell-price'), localCode()),
        line => line.sellPricePerPack
      ),
      ...(foreign()
        ? [
            moneyColumn(
              'lineTotalPo',
              withCode(t('label.line-total'), poCode()),
              lineTotalPo,
              sum(lineTotalPo)
            ),
          ]
        : []),
      moneyColumn(
        'lineTotalLocal',
        withCode(t('label.line-total'), localCode()),
        lineTotalLocal,
        sum(lineTotalLocal)
      ),
      moneyColumn(
        'adjustedTotal',
        withCode(t('label.adjusted-line-total'), localCode()),
        adjustedTotalLocal,
        sum(adjustedTotalLocal)
      ),
    ];
  };

  return (
    <DataTable
      columns={columns()}
      rows={sortedRows()}
      rowKey={line => line.id}
      config={tableConfig.config()}
      setConfig={tableConfig.setConfig}
      onSaveGlobalDefault={
        tableConfig.canSaveGlobalDefault()
          ? tableConfig.saveGlobalTableConfig
          : undefined
      }
      emptyMessage={t('error.no-inbound-items')}
    />
  );
};
