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
  useEditModal,
} from '@openmsupply-client/common';
import { Toolbar } from './Toolbar';
import { AppBarButtons } from './AppBarButtons';
import { ImmunisationProgramCreateModal } from './ImmunisationProgramCreateModal';

export interface Program {
  id: string;
  name: string;
  immunisations: string[];
  isNew: boolean;
}

const ProgramListComponent: FC = () => {
  const {
    updateSortQuery,
    updatePaginationQuery,
    queryParams: { sortBy, page, first, offset },
  } = useUrlQueryParams({ filters: [{ key: 'name' }] });
  const pagination = { page, first, offset };
  const navigate = useNavigate();
  const t = useTranslation('catalogue');

  const draftPrograms: Record<string, Program> = {};

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [draft] = useState<Record<string, Program>>(draftPrograms);

  const columns = useColumns(
    ['name', 'description'],
    {
      onChangeSortBy: updateSortQuery,
      sortBy,
    },
    [updateSortQuery, sortBy]
  );

  // later create modal will use <InsertImmunisationProgram> type
  const { isOpen, onClose, onOpen } = useEditModal<any>();

  return (
    <>
      {isOpen && (
        <ImmunisationProgramCreateModal isOpen={isOpen} onClose={onClose} />
      )}
      <Toolbar />
      <AppBarButtons onCreate={onOpen} />
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

export const ProgramListView: FC = () => (
  <TableProvider
    createStore={createTableStore}
    queryParamsStore={createQueryParamsStore({
      initialSortBy: { key: 'name' },
    })}
  >
    <ProgramListComponent />
  </TableProvider>
);
