import {
  ColumnDef,
  DateUtils,
  ExpiryDateInput,
  Formatter,
  MaterialTable,
  useSimpleMaterialTable,
  useTranslation,
  NumberInputCell,
  TextInputCell,
} from '@openmsupply-client/common';
import {
  getVolumePerPackFromVariant,
  ItemVariantInput,
  useIsItemVariantsEnabled,
} from '@openmsupply-client/system';
import React, { useMemo } from 'react';
import { GenerateCustomerReturnLineFragment } from '../../api';

export const QuantityReturnedTableComponent = ({
  lines,
  updateLine,
  isDisabled,
}: {
  lines: GenerateCustomerReturnLineFragment[];
  updateLine: (
    line: Partial<GenerateCustomerReturnLineFragment> & { id: string }
  ) => void;
  isDisabled: boolean;
}) => {
  const t = useTranslation();
  const showItemVariantsColumn = useIsItemVariantsEnabled();

  const columns = useMemo(
    (): ColumnDef<GenerateCustomerReturnLineFragment>[] => [
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
        Cell: ({ row: { original: row }, cell }) => (
          <TextInputCell
            cell={cell}
            disabled={isDisabled}
            updateFn={value => updateLine({ ...row, batch: value })}
          />
        ),
      },
      {
        accessorKey: 'itemVariantId',
        header: t('label.item-variant'),
        includeColumn: showItemVariantsColumn,
        size: 170,
        Cell: ({ row: { original: row } }) => (
          <ItemVariantInput
            selectedId={row.itemVariantId}
            itemId={row.item.id}
            disabled={isDisabled}
            width={"100%"}
            onChange={variant =>
              updateLine({
                ...row,
                itemVariantId: variant?.id ?? null,
                volumePerPack:
                  getVolumePerPackFromVariant({
                    ...row,
                    itemVariant: variant ?? undefined,
                  }) ?? 0,
              })
            }
          />
        ),
      },
      {
        id: 'expiryDate',
        accessorFn: row => DateUtils.getDateOrNull(row.expiryDate),
        header: t('label.expiry'),
        size: 130,
        Cell: ({ cell, row: { original: row } }) => {
          const value = cell.getValue<Date | null>();
          return <ExpiryDateInput
            value={value}
            onChange={newValue =>
              updateLine({
                ...row,
                expiryDate: newValue
                  ? Formatter.naiveDate(new Date(newValue))
                  : null,
              })
            }
            disabled={isDisabled}
          />
        },
      },
      {
        accessorKey: 'numberOfPacksIssued',
        header: t('label.pack-quantity-issued'),
        includeColumn: lines.some(l => !!l.numberOfPacksIssued),
        size: 100,
      },
      {
        accessorKey: 'packSize',
        header: t('label.pack-size'),
        size: 100,
        accessorFn: row => row.packSize,
        Cell: ({ cell, row: { original: row } }) => (
          <NumberInputCell
            cell={cell}
            disabled={isDisabled}
            defaultValue={0}
            updateFn={packSize => updateLine({
              ...row,
              packSize,
              volumePerPack: getVolumePerPackFromVariant({
                ...row,
                packSize,
              }) ?? 0,
            })}
          />
        ),
      },
      {
        accessorKey: 'numberOfPacksReturned',
        header: t('label.quantity-returned'),
        description: t('description.pack-quantity'),
        size: 100,
        Cell: ({ cell, row: { original: row } }) => (
          <NumberInputCell
            cell={cell}
            disabled={isDisabled}
            updateFn={value =>
              updateLine({ id: row.id, numberOfPacksReturned: value })
            }
            defaultValue={0}
            min={0}
            max={row.numberOfPacksIssued ?? undefined}
          />
        ),
      },
      {
        accessorKey: 'volumePerPack',
        header: t('label.volume-per-pack'),
        size: 100,
        Cell: ({ cell, row: { original: row } }) => (
          <NumberInputCell
            cell={cell}
            disabled={isDisabled}
            updateFn={value =>
              updateLine({ ...row, volumePerPack: value ?? 0 })
            }
            decimalLimit={10}
          />
        ),
      }
    ],
    [lines, showItemVariantsColumn]
  );

  const table = useSimpleMaterialTable<GenerateCustomerReturnLineFragment>({
    tableId: 'customer-return-line-quantity',
    columns,
    data: lines,
  });

  return <MaterialTable table={table} />;
};

export const QuantityReturnedTable = React.memo(QuantityReturnedTableComponent);
