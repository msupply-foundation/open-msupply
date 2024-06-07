import React, { FC, useEffect, useState } from 'react';
import {
  TableProvider,
  createTableStore,
  useBreadcrumbs,
  NothingHere,
  createQueryParamsStore,
  DataTable,
  useNavigate,
  useTranslation,
  useUrlQueryParams,
  useColumns,
} from '@openmsupply-client/common';
import { Toolbar } from './Toolbar';
import { AppBarButtons } from './AppBarButtons';

// dummy data
const data = {
  name: 'some program name',
};

export interface VaccineCourse {
  id: string;
  name: string;
  targetDemographicName: string;
  doses: number;
}

export const ImmunisationProgramComponent: FC = () => {
  const {
    updateSortQuery,
    updatePaginationQuery,
    queryParams: { sortBy, page, first, offset },
  } = useUrlQueryParams({ filters: [{ key: 'name' }] });
  const pagination = { page, first, offset };
  const navigate = useNavigate();
  const t = useTranslation('catalogue');
  const { setSuffix } = useBreadcrumbs();

  const draftProgram: Record<string, VaccineCourse> = {};

  const [draft] = useState(draftProgram);

  const columns = useColumns(
    [
      'name',
      { key: 'targetDemographic', label: 'label.target-demographic' },
      { key: 'doses', label: 'label.doses' },
    ],
    {
      onChangeSortBy: updateSortQuery,
      sortBy,
    },
    [updateSortQuery, sortBy]
  );

  useEffect(() => {
    setSuffix(data?.name ?? '');
  }, [setSuffix]);

  return !!data ? (
    <>
      <Toolbar />
      <AppBarButtons />
      <DataTable
        id={'Program list'}
        pagination={{ ...pagination }}
        onChangePage={updatePaginationQuery}
        columns={columns}
        data={Object.values(draft)}
        isLoading={false}
        onRowClick={row => navigate(row.id)}
        noDataElement={<NothingHere body={t('error.no-master-lists')} />}
      />
    </>
  ) : (
    <NothingHere />
  );
};

export const ImmunisationProgramView: FC = () => (
  <TableProvider
    createStore={createTableStore}
    queryParamsStore={createQueryParamsStore({
      initialSortBy: { key: 'name' },
    })}
  >
    <ImmunisationProgramComponent></ImmunisationProgramComponent>
  </TableProvider>
);
