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
} from '@openmsupply-client/common';
import { ServiceItemSearchInput } from '@openmsupply-client/system';
import { DraftOutboundLine } from './../../../types';

export const useServiceLineColumns = (
  setter: (patch: RecordPatch<DraftOutboundLine>) => void
) => {
  const t = useTranslation('distribution');
  return useColumns<DraftOutboundLine>([
    {
      key: 'serviceItemName',
      label: 'label.name',
      width: 350,
      accessor: ({ rowData }) => rowData?.item?.id,
      Cell: ({ rowData, column, rows }) => {
        const id = column.accessor({ rowData, rows }) as string;
        return (
          <ServiceItemSearchInput
            refetchOnMount={false}
            width={300}
            onChange={item => item && setter({ ...rowData, item })}
            currentItemId={id}
          />
        );
      },
    },
    {
      key: 'note',
      label: 'label.comment',
      width: 200,
      accessor: ({ rowData }) => rowData?.note,
      setter,
      Cell: TextInputCell,
    },
    {
      key: 'totalBeforeTax',
      label: 'label.unit-price',
      width: 200,
      setter,
      Cell: CurrencyInputCell,
    },
    {
      key: 'isDeleted',
      label: 'label.delete',
      align: ColumnAlign.Center,
      width: 100,
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
