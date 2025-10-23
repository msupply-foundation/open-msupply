import {
  ColumnDef,
  ColumnType,
  getLinesFromRow,
  TextWithTooltipCell,
  useTranslation,
} from '@openmsupply-client/common';
import { PurchaseOrderLineFragment } from '../api';
import { usePurchaseOrderLineErrorContext } from '../context';
import { useMemo } from 'react';

export const usePurchaseOrderColumns = () => {
  const t = useTranslation();
  const { getError } = usePurchaseOrderLineErrorContext();

  const columns = useMemo((): ColumnDef<PurchaseOrderLineFragment>[] => {
    return [
      {
        accessorKey: 'lineNumber',
        header: t('label.line-number'),
        columnType: ColumnType.Number,
      },
      {
        accessorKey: 'item.code',
        header: t('label.code'),
        size: 130,
        getIsError: row =>
          getLinesFromRow(row).some(
            r => getError(r)?.__typename === 'ItemCannotBeOrdered'
          ),
      },
      {
        accessorKey: 'item.name',
        header: t('label.item-name'),
        Cell: TextWithTooltipCell,
        size: 350,
      },
      {
        accessorKey: 'numberOfPacks',
        header: t('label.num-packs'),
        columnType: ColumnType.Number,
      },
      {
        accessorKey: 'packSize',
        header: t('label.pack-size'),
        columnType: ColumnType.Number,
        defaultHideOnMobile: true,
      },
      {
        accessorKey: 'requestedNumberOfUnits',
        header: t('label.requested-quantity'),
        columnType: ColumnType.Number,
      },
      {
        accessorKey: 'authorisedNumberOfUnits',
        header: t('label.adjusted-units'),
        columnType: ColumnType.Number,
      },
      {
        // TODO: Goods received calculation
        accessorKey: 'totalReceived',
        header: t('label.total-received'),
        columnType: ColumnType.Number,
      },
      {
        accessorKey: 'stockOnHand',
        header: t('label.soh'),
        columnType: ColumnType.Number,
        defaultHideOnMobile: true,
      },
      {
        accessorKey: 'onOrder',
        header: t('label.on-order'),
        columnType: ColumnType.Number,
      },
      {
        accessorKey: 'totalCost',
        header: t('label.total-cost'),
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
        header: t('label.requested-delivery-date'),
        columnType: ColumnType.Date,
      },
      {
        accessorKey: 'expectedDeliveryDate',
        header: t('label.expected-delivery-date'),
        columnType: ColumnType.Date,
      },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getError]);

  return { columns };
};
