import React from 'react';
import {
  useTranslation,
  RecordPatch,
  useColumns,
  IconButton,
  XCircleIcon,
  CurrencyInputCell,
  ColumnAlign,
  NumberInputCell,
  TextInputCell,
  useFormatCurrency,
  CellProps,
} from '@openmsupply-client/common';
import { ServiceItemSearchInput } from '@openmsupply-client/system';
import { DraftStockOutLine } from './../../../types';

const taxPercentageCell = (props: CellProps<DraftStockOutLine>) => (
  <NumberInputCell {...props} max={100} decimalLimit={2} />
);

export const useServiceLineColumns = (
  setter: (patch: RecordPatch<DraftStockOutLine>) => void
) => {
  const t = useTranslation('distribution');
  const formatCurrency = useFormatCurrency();
  return useColumns<DraftStockOutLine>([
    {
      key: 'serviceItemName',
      label: 'label.name',
      width: 200,
      accessor: ({ rowData }) => rowData?.item?.id,
      Cell: ({ rowData, column }) => {
        const id = column.accessor({ rowData }) as string;
        return (
          <ServiceItemSearchInput
            refetchOnMount={false}
            width={200}
            onChange={item => item && setter({ ...rowData, item })}
            currentItemId={id}
          />
        );
      },
    },
    {
      key: 'note',
      label: 'label.comment',
      width: 150,
      accessor: ({ rowData }) => rowData?.note,
      setter,
      Cell: TextInputCell,
    },
    {
      key: 'totalBeforeTax',
      label: 'label.amount',
      width: 75,
      setter,
      Cell: CurrencyInputCell,
    },
    {
      key: 'taxPercentage',
      label: 'label.tax',
      width: 75,
      setter,
      Cell: taxPercentageCell,
    },
    {
      key: 'totalAfterTax',
      label: 'label.total',
      align: ColumnAlign.Right,
      width: 75,
      accessor: ({ rowData }) => formatCurrency(rowData?.totalAfterTax),
    },
    {
      key: 'isDeleted',
      label: 'label.delete',
      align: ColumnAlign.Center,
      width: 50,
      Cell: ({ rowData }) => (
        <IconButton
          icon={<XCircleIcon />}
          onClick={() => setter({ ...rowData, isDeleted: true })}
          label={t('messages.delete-this-line')}
        />
      ),
      setter,
    },
  ]);
};
