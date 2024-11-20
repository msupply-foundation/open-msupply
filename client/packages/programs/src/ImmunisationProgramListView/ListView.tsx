import React, { FC } from 'react';
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
import { useImmunisationProgramList } from '../api/hooks/useImmunisationProgramList';
import { ImmunisationProgramFragment } from '../api';

export interface Program {
  id: string;
  name: string;
  immunisations: string[];
  isNew: boolean;
}

const ImmunisationProgramListComponent: FC = () => {
  const {
    updateSortQuery,
    updatePaginationQuery,
    queryParams: { sortBy, page, first, offset, filterBy },
  } = useUrlQueryParams({ filters: [{ key: 'name' }] });
  const pagination = { page, first, offset };
  const navigate = useNavigate();
  const t = useTranslation();

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
    ],
    {
      onChangeSortBy: updateSortQuery,
      sortBy,
    },
    [updateSortQuery, sortBy]
  );

  return (
    <>
      <DataTable
        id={'immunisation-list'}
        pagination={{ ...pagination }}
        onChangePage={updatePaginationQuery}
        columns={columns}
        data={data?.nodes ?? []}
        isLoading={isLoading}
        isError={isError}
        onRowClick={row => navigate(row.id)}
        noDataElement={
          <NothingHere body={t('error.no-immunisation-programs')} />
        }
      />
    </>
  );
};

export const ImmunisationProgramListView: FC = () => (
  <TableProvider
    createStore={createTableStore}
    queryParamsStore={createQueryParamsStore({
      initialSortBy: { key: 'name' },
    })}
  >
    <ImmunisationProgramListComponent />
  </TableProvider>
);
