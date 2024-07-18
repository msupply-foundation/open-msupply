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
  useEditModal,
} from '@openmsupply-client/common';
import { Toolbar } from './Toolbar';
import { AppBarButtons } from './AppBarButtons';
import { useRnRFormList } from '../../api';
import { RnRFormFragment } from '../../api/operations.generated';
import { RnRFormCreateModal } from './RnRFormCreateModal';

const RnRFormListComponent = () => {
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
  const { data, isLoading, isError } = useRnRFormList(queryParams);

  const { isOpen, onClose, onOpen } = useEditModal();

  const columns = useColumns<RnRFormFragment>(
    [
      {
        key: 'periodName',
        width: 350,
        label: 'label.period',
      },
      [
        'createdDatetime',
        { accessor: ({ rowData }) => rowData.createdDatetime },
      ],
      {
        key: 'programName',
        label: 'label.program-name',
      },
      {
        key: 'supplierName',
        label: 'label.supplier',
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
      <RnRFormCreateModal isOpen={isOpen} onClose={onClose} />
      <Toolbar />
      <AppBarButtons onCreate={onOpen} />
      <DataTable
        id={'rnr-form-list'}
        pagination={{ ...pagination }}
        onChangePage={updatePaginationQuery}
        columns={columns}
        data={data?.nodes ?? []}
        isLoading={isLoading}
        isError={isError}
        onRowClick={row => navigate(row.id)}
        noDataElement={<NothingHere body={t('error.no-rnr-forms')} />}
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
