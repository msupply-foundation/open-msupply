import React from 'react';
import {
  useTranslation,
  RecordPatch,
  useColumns,
  IconButton,
  XCircleIcon,
  TextInputCell,
  CurrencyInputCell,
  ColumnAlign,
  NumberInputCell,
  CellProps,
  CurrencyCell,
} from '@openmsupply-client/common';
import {
  ServiceItemSearchInput,
  toItemWithPackSize,
} from '@openmsupply-client/system';
import { DraftInboundLine } from './../../../../types';

const TaxPercentageCell = (props: CellProps<DraftInboundLine>) => (
  <NumberInputCell {...props} max={100} decimalLimit={2} />
);

export const useServiceLineColumns = (
  setter: (patch: RecordPatch<DraftInboundLine>) => void
) => {
  const t = useTranslation('replenishment');
  return useColumns<DraftInboundLine>([
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
            onChange={item =>
              item && setter({ ...rowData, item: toItemWithPackSize({ item }) })
            }
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
      Cell: TaxPercentageCell,
    },
    {
      key: 'totalAfterTax',
      label: 'label.total',
      align: ColumnAlign.Right,
      width: 75,
      Cell: CurrencyCell,
      accessor: ({ rowData }) => rowData?.totalAfterTax,
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
