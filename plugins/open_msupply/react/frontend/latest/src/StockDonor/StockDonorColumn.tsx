import React, { useEffect } from 'react';
import {
  ArrayElement,
  BasicCellLayout,
  ColumnDef,
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

const DonorColumn = ({ row }: { row: StockLineRowFragment }) => {
  const { getById } = useColumnStore();

  return <BasicCellLayout>{getById(row)?.data || ''}</BasicCellLayout>;
};

export const StockDonorColumn: ColumnDef<StockLineRowFragment> = {
  Cell: ({ row }) => (
    <QueryClientProviderProxy>
      <DonorColumn row={row.original} />
    </QueryClientProviderProxy>
  ),
  id: 'stock-donor',
  header: 'Donor',
  size: 150,
};
