import React, { useState } from 'react';
import {
  TableProvider,
  DataTable,
  useColumns,
  createTableStore,
  NothingHere,
  useUrlQueryParams,
  DotCell,
  ColumnAlign,
  useEditModal,
  useToggle,
} from '@openmsupply-client/common';
import { useName } from '../../api';
import { NameRenderer } from '../../Components';
import { Toolbar } from './Toolbar';
import { FacilityEditModal } from './FacilityEditModal';
import { AppBarButtons } from './AppBarButtons';
import { PropertiesImportModal } from '../ImportProperties/PropertiesImportModal';
import { FacilityNameRowFragment } from '../../api/operations.generated';

const FacilitiesListComponent = () => {
  const [selectedId, setSelectedId] = useState('');
  const {
    filter,
    updateSortQuery,
    updatePaginationQuery,
    queryParams: { sortBy, page, first, offset },
  } = useUrlQueryParams();
  const { data, isError, isLoading } = useName.document.facilities();
  const pagination = { page, first, offset };

  const { isOpen, onClose, onOpen } = useEditModal<FacilityNameRowFragment>();
  const importPropertiesModalController = useToggle();

  const onRowClick = (row: FacilityNameRowFragment) => {
    setSelectedId(row.id);
    onOpen();
  };

  const columns = useColumns<FacilityNameRowFragment>(
    [
      {
        key: 'code',
        label: 'label.code',
        Cell: ({ rowData }) => (
          <NameRenderer label={rowData.code} isStore={!!rowData.store} />
        ),
        width: 100,
      },
      'name',
      {
        key: 'isSupplier',
        label: 'label.supplier',
        align: ColumnAlign.Center,
        Cell: DotCell,
        width: 75,
        sortable: false,
      },
      {
        key: 'isCustomer',
        label: 'label.customer',
        align: ColumnAlign.Center,
        Cell: DotCell,
        width: 75,
        sortable: false,
      },
      {
        key: 'isDonor',
        label: 'label.donor',
        align: ColumnAlign.Center,
        Cell: DotCell,
        width: 75,
        sortable: false,
      },
    ],
    {
      sortBy,
      onChangeSortBy: updateSortQuery,
    },
    [sortBy]
  );

  return (
    <>
      <PropertiesImportModal
        isOpen={importPropertiesModalController.isOn}
        onClose={importPropertiesModalController.toggleOff}
      />
      <AppBarButtons importModalController={importPropertiesModalController} />
      <Toolbar filter={filter} />
      {isOpen && (
        <FacilityEditModal
          isOpen={isOpen}
          nameId={selectedId}
          onClose={onClose}
          setNextFacility={setSelectedId}
        />
      )}
      <DataTable
        id="name-list"
        pagination={{ ...pagination, total: data?.totalCount ?? 0 }}
        onChangePage={updatePaginationQuery}
        columns={columns}
        data={data?.nodes}
        isLoading={isLoading}
        isError={isError}
        noDataElement={<NothingHere />}
        onRowClick={onRowClick}
      />
    </>
  );
};

export const FacilitiesListView = () => (
  <TableProvider createStore={createTableStore}>
    <FacilitiesListComponent />
  </TableProvider>
);
