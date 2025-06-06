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
  UNDEFINED_STRING_VALUE,
} from '@openmsupply-client/common';
import { RequestLineFragment } from '@openmsupply-client/system';
import { usePluginData } from '../../../../../api';

const useColumnStore = create<PluginDataStore<RequestLineFragment, string>>(
  (set, get) => ({
    data: [],
    set: data => set(state => ({ ...state, data })),
    getById: row =>
      get().data.find(({ relatedRecordId }) => relatedRecordId == row.id),
  })
);

type ForecastQuantityColumn = NonNullable<
  ArrayElement<Plugins['requestRequisitionLine']>
>;

export const StateLoader: ArrayElement<
  ForecastQuantityColumn['tableStateLoader']
> = props => {
  const { set } = useColumnStore();

  const {
    query: { data },
  } = usePluginData({
    pluginCode: 'forecasting_plugins',
    filter: {
      dataIdentifier: { equalTo: 'FORECAST_QUANTITY_INFO' },
      relatedRecordId: { equalAny: props.requestLines.map(({ id }) => id) },
    },
    // By using the line IDs as the keys, it will cause the query to re-fetch
    // whenever a line is added/removed
    queryKey: props.requestLines.map(line => line.id),
  });

  useEffect(() => {
    if (!!data) {
      set(data);
    }
  }, [data]);

  return <></>;
};

const ForecastColumn = ({ rowData }: CellProps<RequestLineFragment>) => {
  const { getById } = useColumnStore();

  const parsed = JSON.parse(getById(rowData)?.data || '{}');
  const value = parsed?.forecastTotalUnits
    ? String(Math.ceil(parsed?.forecastTotalUnits))
    : UNDEFINED_STRING_VALUE;

  return <BasicCellLayout>{value}</BasicCellLayout>;
};

const Column = (props: CellProps<RequestLineFragment>) => (
  <QueryClientProviderProxy>
    <ForecastColumn {...props} />
  </QueryClientProviderProxy>
);

export const ForecastQuantityColumn: ColumnDefinition<RequestLineFragment> = {
  Cell: Column,
  key: 'forecast-quantity',
  label: 'plugin.forecasting.forecast-amount',
  maxWidth: 150,
  sortable: false,
  order: 111,
};
