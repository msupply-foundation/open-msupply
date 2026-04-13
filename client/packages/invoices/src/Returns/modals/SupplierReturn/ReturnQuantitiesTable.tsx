import React, { useMemo } from 'react';
import {
  MaterialTable,
  useSimpleMaterialTable,
  ColumnDef,
  useTranslation,
  RequiredNumberInputCell,
  ColumnType,
  CheckCell,
} from '@openmsupply-client/common';
import { GenerateSupplierReturnLineFragment } from '../../api';

export const QuantityToReturnTableComponent = ({
  lines,
  updateLine,
  isDisabled,
}: {
  lines: GenerateSupplierReturnLineFragment[];
  updateLine: (
    line: Partial<GenerateSupplierReturnLineFragment> & { id: string }
  ) => void;
  isDisabled: boolean;
}) => {
  const t = useTranslation();

  const columns = useMemo(
    (): ColumnDef<GenerateSupplierReturnLineFragment>[] => [
      {
        accessorKey: 'itemCode',
        header: t('label.code'),
        size: 100,
      },
      {
        accessorKey: 'itemName',
        header: t('label.name'),
        size: 200,
      },
      {
        accessorKey: 'batch',
        header: t('label.batch'),
        size: 100,
      },
      {
        accessorKey: 'expiryDate',
        header: t('label.expiry'),
        size: 100,
      },
      {
        accessorKey: 'item.unitName',
        header: t('label.unit'),
        size: 100,
      },
      {
        accessorKey: 'packSize',
        header: t('label.pack-size'),
        columnType: ColumnType.Number,
        size: 100,
      },
      {
        accessorKey: 'availableNumberOfPacks',
        header: t('label.available-quantity-for-return'),
        description: t('description.pack-quantity'),
        columnType: ColumnType.Number,
        size: 100,
      },
      {
        id: 'onHold',
        header: t('label.on-hold'),
        size: 70,
        accessorFn: row => row.onHold,
        Cell: CheckCell,
      },
      {
        accessorKey: 'numberOfPacksToReturn',
        header: t('label.quantity-to-return'),
        description: t('description.pack-quantity'),
        size: 100,
        pin: 'right',
        Cell: ({ cell, row: { original: row } }) => (
          <RequiredNumberInputCell
            cell={cell}
            disabled={isDisabled || row.onHold}
            updateFn={value =>
              updateLine({ id: row.id, numberOfPacksToReturn: value })
            }
            defaultValue={0}
            min={0}
            max={Math.floor(row.availableNumberOfPacks)}
          />
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const table = useSimpleMaterialTable<GenerateSupplierReturnLineFragment>({
    tableId: 'supplier-return-line-quantity',
    columns,
    data: lines,
  });

  return <MaterialTable table={table} />;
};

export const QuantityToReturnTable = React.memo(QuantityToReturnTableComponent);
