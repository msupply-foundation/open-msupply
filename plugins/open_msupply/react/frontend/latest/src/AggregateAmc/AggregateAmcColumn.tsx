import React, { useEffect } from 'react';
import {
  ArrayElement,
  Box,
  ColumnDef,
  create,
  InputWithLabelRow,
  NumericTextInput,
  PluginDataStore,
  Plugins,
  QueryClientProviderProxy,
  useAuthContext,
  useGql,
  useQuery,
} from '@openmsupply-client/common';
import { RequestLineFragment } from '@openmsupply-client/system';
import { getSdk } from './api/operations.generated';
import { name as pluginCode } from '../../package.json';

const usePluginData = (ids: string[]) => {
  const { client } = useGql();
  const { storeId } = useAuthContext();
  const sdk = getSdk(client);

  // need to share this
  const dataIdentifier = 'AGGREGATE_AMC_REQUISITION_LINE';

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

type AggregateAcmColumn = NonNullable<Plugins['requestRequisitionLine']>;

type AggregateAmcEditView = NonNullable<
  ArrayElement<AggregateAcmColumn['editViewField']>
>;

export const StateLoader: ArrayElement<
  AggregateAcmColumn['tableStateLoader']
> = ({ requestLines }) => {
  const { set } = useColumnStore();
  const { data } = usePluginData(requestLines.map(({ id }) => id));

  useEffect(() => {
    if (!!data) {
      set(data.pluginData.nodes);
    }
  }, [data]);

  return <></>;
};

const ColumnInner = ({ row }: { row: RequestLineFragment }) => {
  const { getById } = useColumnStore();

  return <Box>{getById(row)?.data || ''}</Box>;
};

export const AggregateAmcEditView: AggregateAmcEditView = ({ line }) => {
  const { data } = usePluginData([line.id]);
  const value = Number(data?.pluginData.nodes?.[0]?.data);
  if (isNaN(value)) return null;

  return (
    <InputWithLabelRow
      Input={
        <NumericTextInput width={100} value={value} decimalLimit={2} disabled />
      }
      labelWidth={'150px'}
      label={'Aggregate Amc'}
      sx={{ marginBottom: 1 }}
    />
  );
};

export const AggregateAmcColumn: ColumnDef<RequestLineFragment> = {
  id: 'aggregate amc',
  header: 'Aggregate Amc',
  size: 150,
  Cell: ({ row }) => (
    <QueryClientProviderProxy>
      <ColumnInner row={row.original} />
    </QueryClientProviderProxy>
  ),
};
