import React from 'react';
import {
  BasicCellLayout,
  CellProps,
  ColumnDefinition,
  QueryClientProviderProxy,
  RecordWithId,
} from '@openmsupply-client/common';
import { StockLineRowFragment } from '@openmsupply-client/system';
import { usePluginData } from './api';

const DonorColumn = <T extends RecordWithId>({ rowData }: CellProps<T>) => {
  const { data } = usePluginData.data(rowData?.id ?? '');

  return <BasicCellLayout>{data?.data ?? ''}</BasicCellLayout>;
};

const Column = <T extends RecordWithId>(props: CellProps<T>) => (
  <QueryClientProviderProxy>
    <DonorColumn {...props} />
  </QueryClientProviderProxy>
);

const StockDonorColumn: ColumnDefinition<StockLineRowFragment> = {
  Cell: Column,
  key: 'stock-donor',
  label: 'label.donor',
  maxWidth: 150,
  sortable: false,
  order: 103,
};

export default StockDonorColumn;
