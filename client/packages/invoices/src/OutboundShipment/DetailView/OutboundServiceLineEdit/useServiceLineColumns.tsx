import React, { useMemo } from 'react';
import {
  useTranslation,
  RecordPatch,
  IconButton,
  XCircleIcon,
  ColumnAlign,
  ColumnDef,
  ColumnType,
} from '@openmsupply-client/common';
import { ServiceItemSearchInput, toItemWithPackSize } from '@openmsupply-client/system';
import { DraftInboundLine, DraftStockOutLine } from './../../../types';
// Need to be re-exported when Legacy cells are removed
import { TextInputCell } from '@openmsupply-client/common/src/ui/layout/tables/material-react-table/components/TextInputCell';
import { NumberInputCell } from '@openmsupply-client/common/src/ui/layout/tables/material-react-table/components/NumberInputCell';
import { CurrencyInputCell } from '@openmsupply-client/common/src/ui/layout/tables/material-react-table/components/CurrencyInputCell';

export const useServiceLineColumns = <T extends DraftInboundLine | DraftStockOutLine>(
  setter: (patch: RecordPatch<T>) => void
) => {
  const t = useTranslation();

  const columns = useMemo(
    (): ColumnDef<T>[] => [
      {
        id: 'serviceItemName',
        accessorFn: row => row.item?.id,
        header: t('label.name'),
        size: 200,
        Cell: ({ row }) => {
          const rowData = row.original;
          const id = rowData.item?.id;
          return (
            <ServiceItemSearchInput
              refetchOnMount={false}
              width={200}
              onChange={item => item && setter({ ...rowData, item: toItemWithPackSize({ item }) })}
              currentItemId={id}
            />
          );
        }
      },
      {
        id: 'note',
        accessorFn: row => row.note,
        header: t('label.comment'),
        size: 150,
        Cell: ({ cell, row }) => (
          <TextInputCell
            cell={cell}
            updateFn={value => setter({ ...row.original, note: value })}
            autoFocus={row.index === 0}
          />
        ),
      },
      {
        id: 'totalBeforeTax',
        accessorFn: row => row.totalBeforeTax,
        header: t('label.amount'),
        size: 75,
        Cell: ({ cell, row }) => (
          <CurrencyInputCell
            cell={cell}
            updateFn={value =>
              setter({ ...row.original, totalBeforeTax: value })
            }
          />
        ),
      },
      {
        id: 'taxPercentage',
        accessorFn: row => row.taxPercentage,
        header: t('label.tax'),
        size: 75,
        Cell: ({ cell, row }) => (
          <NumberInputCell
            cell={cell}
            updateFn={value =>
              setter({ ...row.original, taxPercentage: value })
            }
            max={100}
            decimalLimit={2}
            endAdornment="%"
          />
        ),
      },
      {
        accessorKey: 'totalAfterTax',
        header: t('label.total'),
        size: 75,
        columnType: ColumnType.Currency,
      },
      {
        id: 'delete',
        header: t('label.delete'),
        size: 50,
        align: ColumnAlign.Center,
        Cell: ({ row }) => (
          <IconButton
            icon={<XCircleIcon />}
            onClick={() => setter({ ...row.original, isDeleted: true })}
            label={t('messages.delete-this-line')}
          />
        ),
      },
    ],
    []
  );

  return columns;
};
