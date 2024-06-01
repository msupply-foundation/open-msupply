import React, { FC, useState } from 'react';
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
  RecordPatch,
} from '@openmsupply-client/common';
import { Toolbar } from './Toolbar';
import { AppBarButtons } from './AppBarButtons';

export interface Program {
  id: string;
  name: string;
  immunisations: string[];
  isNew: boolean;
}

const ImmunisationsListComponent: FC = () => {
  const {
    updateSortQuery,
    updatePaginationQuery,
    queryParams: { sortBy, page, first, offset },
  } = useUrlQueryParams({ filters: [{ key: 'name' }] });
  const pagination = { page, first, offset };
  const navigate = useNavigate();
  const t = useTranslation('catalogue');

  const draftPrograms: Record<string, Program> = {};
  const [draft, setDraft] = useState<Record<string, Program>>(draftPrograms);

  const columns = useColumns(
    ['name', 'description'],
    {
      onChangeSortBy: updateSortQuery,
      sortBy,
    },
    [updateSortQuery, sortBy]
  );

  const setter = (patch: RecordPatch<Program>) => {
    const updatedDraft = { ...draft, [patch.id]: patch } as Record<
      string,
      Program
    >;
    setDraft({ ...updatedDraft });
  };

  return (
    <>
      <Toolbar />
      <AppBarButtons patch={setter} />
      <DataTable
        id={'immunisation-list'}
        pagination={{ ...pagination }}
        onChangePage={updatePaginationQuery}
        columns={columns}
        data={Object.values(draft)}
        isLoading={false}
        onRowClick={row => navigate(row.id)}
        noDataElement={<NothingHere body={t('error.no-master-lists')} />}
      />
    </>
  );
};

export const ImmunisationsListView: FC = () => (
  <TableProvider
    createStore={createTableStore}
    queryParamsStore={createQueryParamsStore({
      initialSortBy: { key: 'name' },
    })}
  >
    <ImmunisationsListComponent />
  </TableProvider>
);
