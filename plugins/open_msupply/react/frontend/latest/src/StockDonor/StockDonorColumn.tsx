import React, { useEffect } from 'react';
import {
  ArrayElement,
  BasicCellLayout,
  CellProps,
  ColumnDefinition,
  create,
  PluginDataStore,
  Plugins,
  QueryClientProviderProxy,
} from '@openmsupply-client/common';
import { StockLineRowFragment } from '@openmsupply-client/system';
import { usePluginData } from './api';

const useColumnStore = create<PluginDataStore<StockLineRowFragment, string>>(
  (set, get) => ({
    data: [],
    set: data => set(state => ({ ...state, data })),
    getById: row =>
      get().data.find(({ relatedRecordId }) => relatedRecordId == row.id),
  })
);

type StockDonorColumn = NonNullable<ArrayElement<Plugins['stockLine']>>;

export const StateLoader: ArrayElement<
  StockDonorColumn['tableStateLoader']
> = ({ stockLines }) => {
  const { set } = useColumnStore();
  const { data } = usePluginData.data(stockLines.map(({ id }) => id));

  useEffect(() => {
    if (!!data) {
      set(data);
    }
  }, [data]);

  return <></>;
};

const DonorColumn = ({ rowData }: CellProps<StockLineRowFragment>) => {
  const { getById } = useColumnStore();

  return <BasicCellLayout>{getById(rowData)?.data || ''}</BasicCellLayout>;
};

const Column = (props: CellProps<StockLineRowFragment>) => (
  <QueryClientProviderProxy>
    <DonorColumn {...props} />
  </QueryClientProviderProxy>
);

export const StockDonorColumn: ColumnDefinition<StockLineRowFragment> = {
  Cell: Column,
  key: 'stock-donor',
  label: 'label.donor',
  maxWidth: 150,
  sortable: false,
  order: 103,
};
