import React from 'react';
import {
  NothingHere,
  useTranslation,
  useUrlQueryParams,
  usePaginatedMaterialTable,
  MaterialTable,
} from '@openmsupply-client/common';
import { useClinicianListColumns } from './columns';
import { useClinicians } from '@openmsupply-client/programs';

export const ClinicianListView = () => {
  const {
    queryParams: { first, offset, sortBy },
  } = useUrlQueryParams();
  const { data, isError, isFetching } = useClinicians.document.list({
    pagination: { first, offset },
    sortBy: sortBy.key ? sortBy : { key: 'lastName' },
  });
  const columns = useClinicianListColumns();

  const t = useTranslation();

  const { table } = usePaginatedMaterialTable({
    tableId: 'clinician-list',
    columns,
    data: data?.nodes,
    totalCount: data?.totalCount || 0,
    isError,
    isLoading: isFetching,
    enableRowSelection: false,
    noDataElement: <NothingHere body={t('error.no-clinicians')} />,
  });

  return <MaterialTable table={table} />;
};
