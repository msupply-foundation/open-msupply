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
  TooltipTextCell,
  useTranslation,
} from '@openmsupply-client/common';
import { useName } from '../../api';
import { Toolbar } from './Toolbar';
import { StoreEditModal } from './StoreEditModal';
import { AppBarButtons } from './AppBarButtons';
import { PropertiesImportModal } from '../ImportProperties/PropertiesImportModal';
import { FacilityNameRowFragment } from '../../api/operations.generated';

const StoresListComponent = () => {
  const t = useTranslation();
  const [selectedId, setSelectedId] = useState('');
  const {
    filter,
    updateSortQuery,
    updatePaginationQuery,
    queryParams: { sortBy, page, first, offset },
  } = useUrlQueryParams();
  const { data, isError, isLoading } = useName.document.stores();
  const { data: properties, isLoading: propertiesLoading } =
    useName.document.properties();
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
        Cell: TooltipTextCell,
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
      <AppBarButtons
        importModalController={importPropertiesModalController}
        properties={properties}
        propertiesLoading={propertiesLoading}
      />
      <Toolbar filter={filter} />
      {isOpen && (
        <StoreEditModal
          isOpen={isOpen}
          nameId={selectedId}
          onClose={onClose}
          setNextStore={setSelectedId}
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
        noDataElement={<NothingHere body={t('error.no-stores')} />}
        onRowClick={onRowClick}
      />
    </>
  );
};

export const StoresListView = () => (
  <TableProvider createStore={createTableStore}>
    <StoresListComponent />
  </TableProvider>
);
