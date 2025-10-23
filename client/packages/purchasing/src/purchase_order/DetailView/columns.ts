import {
  ColumnDef,
  ColumnType,
  getLinesFromRow,
  TextWithTooltipCell,
} from '@openmsupply-client/common';
import { PurchaseOrderLineFragment } from '../api';
import { usePurchaseOrderLineErrorContext } from '../context';
import { useMemo } from 'react';

export const usePurchaseOrderColumns = () => {
  const { getError } = usePurchaseOrderLineErrorContext();

  const columns = useMemo((): ColumnDef<PurchaseOrderLineFragment>[] => {
    return [
      {
        accessorKey: 'lineNumber',
        header: 'label.line-number',
        columnType: ColumnType.Number,
      },
      {
        accessorKey: 'item.code',
        header: 'label.item-code',
        size: 130,
        getIsError: row =>
          getLinesFromRow(row).some(
            r => getError(r)?.__typename === 'ItemCannotBeOrdered'
          ),
      },
      {
        accessorKey: 'item.name',
        header: 'label.item-name',
        Cell: TextWithTooltipCell,
        size: 350,
      },
      {
        accessorKey: 'numberOfPacks',
        header: 'label.num-packs',
        columnType: ColumnType.Number,
      },
      {
        accessorKey: 'packSize',
        header: 'label.pack-size',
        columnType: ColumnType.Number,
        defaultHideOnMobile: true,
      },
      {
        accessorKey: 'requestedNumberOfUnits',
        header: 'label.requested-quantity',
        columnType: ColumnType.Number,
      },
      {
        accessorKey: 'authorisedNumberOfUnits',
        header: 'label.adjusted-units',
        columnType: ColumnType.Number,
      },
      {
        // TODO: Goods received calculation
        accessorKey: 'totalReceived',
        header: 'label.total-received',
        columnType: ColumnType.Number,
      },
      {
        accessorKey: 'stockOnHand',
        header: 'label.soh',
        columnType: ColumnType.Number,
        defaultHideOnMobile: true,
      },
      {
        accessorKey: 'onOrder',
        header: 'label.on-order',
        columnType: ColumnType.Number,
      },
      {
        accessorKey: 'totalCost',
        header: 'label.total-cost',
        columnType: ColumnType.Currency,
        accessorFn: row => {
          const units =
            row.adjustedNumberOfUnits ?? row.requestedNumberOfUnits ?? 0;
          const packSize = row.requestedPackSize || 1;
          return (row.pricePerPackAfterDiscount ?? 0) * (units / packSize);
        },
      },
      {
        accessorKey: 'requestedDeliveryDate',
        header: 'label.requested-delivery-date',
        columnType: ColumnType.Date,
      },
      {
        accessorKey: 'expectedDeliveryDate',
        header: 'label.expected-delivery-date',
        columnType: ColumnType.Date,
      },
    ];
  }, [getError]);

  return { columns };
};
