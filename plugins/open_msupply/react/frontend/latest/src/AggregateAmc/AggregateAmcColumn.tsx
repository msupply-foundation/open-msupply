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
  useAuthContext,
  useGql,
  useQuery,
} from '@openmsupply-client/common';
import { RequestLineFragment } from '@openmsupply-client/system';
import { getSdk } from './api/operations.generated';

const usePluginData = (ids: string[]) => {
  const { client } = useGql();
  const { storeId } = useAuthContext();
  const sdk = getSdk(client);

  // need to share this
  const dataIdentifier = 'AGGREGATE_AMC_REQUISITION_LINE';
  const pluginCode = 'AGGREGATE_AMC';

  return useQuery(
    pluginCode + ids,
    async () =>
      sdk.pluginData({
        storeId,
        dataIdentifier,
        pluginCode,
        requisitionLineIds: ids,
      }),
    {
      retry: false,
      onError: () => {},
    }
  );
};

const useColumnStore = create<PluginDataStore<RequestLineFragment, string>>(
  (set, get) => ({
    data: [],
    set: data => set(state => ({ ...state, data })),
    getById: row =>
      get().data.find(({ relatedRecordId }) => relatedRecordId == row.id),
  })
);

type AggregateAcmColumn = NonNullable<
  ArrayElement<Plugins['requestRequisitionColumn']>
>;

export const StateLoader: ArrayElement<AggregateAcmColumn['StateLoader']> = ({
  requestLines,
}) => {
  const { set } = useColumnStore();
  const { data } = usePluginData(requestLines.map(({ id }) => id));

  useEffect(() => {
    if (!!data) {
      set(data.pluginData.nodes);
    }
  }, [data]);

  return <></>;
};

const ColumnInner = ({ rowData }: CellProps<RequestLineFragment>) => {
  const { getById } = useColumnStore();

  return <BasicCellLayout>{getById(rowData)?.data || ''}</BasicCellLayout>;
};

const Column = (props: CellProps<RequestLineFragment>) => (
  <QueryClientProviderProxy>
    <ColumnInner {...props} />
  </QueryClientProviderProxy>
);

export const AggregateAmcColumn: ColumnDefinition<RequestLineFragment> = {
  Cell: Column,
  key: 'aggregate amc',
  label: 'Aggregate Amc',
  maxWidth: 150,
  sortable: false,
  order: 103,
};
