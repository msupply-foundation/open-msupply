import React from 'react';
import {
  TableProvider,
  DataTable,
  useColumns,
  useUrlQueryParams,
  useNavigate,
  NothingHere,
  useTranslation,
  createTableStore,
  createQueryParamsStore,
  UNDEFINED_STRING_VALUE,
} from '@openmsupply-client/common';
import { Toolbar } from './Toolbar';
import { AppBarButtons } from './AppBarButtons';
import { useImmunisationProgramList } from '../../api/hooks/useImmunisationProgramList';
import { ImmunisationProgramFragment } from '../../api';

const RnRFormListComponent= () => {
  const {
    updateSortQuery,
    updatePaginationQuery,
    queryParams: { sortBy, page, first, offset, filterBy },
  } = useUrlQueryParams({ filters: [{ key: 'name' }] });
  const pagination = { page, first, offset };
  const navigate = useNavigate();
  const t = useTranslation('programs');

  const queryParams = {
    filterBy,
    offset,
    sortBy,
    first,
  };
  const { data, isLoading, isError } = useImmunisationProgramList(queryParams);

  const columns = useColumns<ImmunisationProgramFragment>(
    [
      [
        'name',
        {
          width: 350,
          label: 'label.program-name',
        },
      ],
      {
        key: 'vaccine-courses',
        label: 'label.vaccine-courses',
        sortable: false,
        accessor: ({ rowData }) =>
          rowData?.vaccineCourses?.length === 0
            ? UNDEFINED_STRING_VALUE
            : rowData.vaccineCourses?.map(n => n.name).join(', '),
      },
      'selection',
    ],
    {
      onChangeSortBy: updateSortQuery,
      sortBy,
    },
    [updateSortQuery, sortBy]
  );


  return (
    <>
      <Toolbar />
      <AppBarButtons onCreate={() => {/* TODO */}} />
      <DataTable
        id={'rnr-form-list'}
        pagination={{ ...pagination }}
        onChangePage={updatePaginationQuery}
        columns={columns}
        data={data?.nodes ?? []}
        isLoading={isLoading}
        isError={isError}
        onRowClick={row => navigate(row.id)}
        noDataElement={
          <NothingHere body={t('error.no-rnr-forms')} />
        }
      />
    </>
  );
};

export const RnRFormListView = () => (
  <TableProvider
    createStore={createTableStore}
    queryParamsStore={createQueryParamsStore({
      initialSortBy: { key: 'name' },
    })}
  >
    <RnRFormListComponent />
  </TableProvider>
);
