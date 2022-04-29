import React from 'react';
import {
  useTranslation,
  RecordPatch,
  useColumns,
  IconButton,
  XCircleIcon,
  CurrencyInputCell,
  ColumnAlign,
  NonNegativeIntegerCell,
  TextInputCell,
  useFormatCurrency,
} from '@openmsupply-client/common';
import { ServiceItemSearchInput } from '@openmsupply-client/system';
import { DraftOutboundLine } from './../../../types';
import { get } from './../../../utils';

export const useServiceLineColumns = (
  setter: (patch: RecordPatch<DraftOutboundLine>) => void
) => {
  const t = useTranslation('distribution');
  const c = useFormatCurrency();
  return useColumns<DraftOutboundLine>([
    {
      key: 'serviceItemName',
      label: 'label.name',
      width: 200,
      accessor: ({ rowData }) => rowData?.item?.id,
      Cell: ({ rowData, column, rows }) => {
        const id = column.accessor({ rowData, rows }) as string;
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
      Cell: NonNegativeIntegerCell,
    },
    {
      key: 'totalAfterTax',
      label: 'label.total',
      align: ColumnAlign.Right,
      width: 75,
      accessor: ({ rowData }) => c(get.serviceChargeTotal(rowData)),
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
