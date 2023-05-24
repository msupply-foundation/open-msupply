import React, { FC } from 'react';
import {
  useTranslation,
  useFormatDateTime,
  useColumns,
  DataTable,
  ColumnFormat,
} from '@openmsupply-client/common';
import { RepackFragment, useStock } from '../../api';

export const ListView: FC<{ recordId: string }> = ({ recordId }) => {
  const t = useTranslation('inventory');
  const { data, isError, isLoading } = useStock.repack.list(recordId);
  const { localisedTime } = useFormatDateTime();

  const columns = useColumns<RepackFragment>([
    {
      key: 'datetime',
      label: 'label.date',
      format: ColumnFormat.Date,
    },
    {
      key: 'time',
      label: 'label.time',
      accessor: ({ rowData }) => localisedTime(rowData.datetime),
    },
    {
      key: 'packSize',
      label: 'label.pack-size',
      accessor: ({ rowData }) => rowData?.to.packSize,
    },
    {
      key: 'numPacks',
      label: 'label.num-packs',
      accessor: ({ rowData }) => rowData?.to.numberOfPacks,
    },
    {
      key: 'location',
      label: 'label.location',
      accessor: ({ rowData }) => rowData?.to.location?.name,
    },
  ]);

  return (
    <DataTable
      id="repack-list"
      columns={columns}
      data={data?.nodes}
      isLoading={isLoading}
      isError={isError}
      noDataMessage={t('messages.no-repacks')}
      overflowX="auto"
    />
  );
};
