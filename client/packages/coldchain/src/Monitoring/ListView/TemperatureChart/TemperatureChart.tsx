import React from 'react';
import { useUrlQueryParams } from '@openmsupply-client/common';
import { Toolbar } from '../../../Monitoring/ListView/TemperatureLog/Toolbar';
import { useTemperatureLogs } from '../../../Monitoring/api/TemperatureLog/hooks/document/useTemperatureLogs';
import { Chart } from '../../../common/Monitoring';
import { MAX_DATA_POINTS } from '../../../common/Monitoring/Chart/utils';
import { getDateRangeAndFilter } from './utils';

const temperatureLogFilterAndSort = {
  initialSort: { key: 'datetime', dir: 'asc' as 'asc' | 'desc' },
  filters: [
    { key: 'datetime', condition: 'between' },
    {
      key: 'sensor.name',
    },
    {
      key: 'location.code',
    },
    {
      key: 'temperatureBreach.type',
      condition: 'equalTo',
    },
  ],
};

export const TemperatureChart = () => {
  const {
    filter,
    queryParams: { filterBy },
  } = useUrlQueryParams(temperatureLogFilterAndSort);

  const {
    filterBy: updatedFilterBy,
    fromDatetime,
    toDatetime,
  } = getDateRangeAndFilter(filterBy);

  const queryParams = {
    filterBy: updatedFilterBy,
    offset: 0,
    sortBy: { key: 'datetime', direction: 'asc' as 'asc' | 'desc' },
    first: MAX_DATA_POINTS,
  };

  const { data, isLoading } = useTemperatureLogs(queryParams);
  const dataTruncated = (data?.totalCount ?? 0) > (data?.nodes.length ?? 0);
  return (
    <>
      <Toolbar filter={filter} />
      <Chart
        isLoading={isLoading}
        data={data?.nodes ?? []}
        dataTruncated={dataTruncated}
        startTime={fromDatetime}
        endTime={toDatetime}
      />
    </>
  );
};
