import React, { useMemo, useState } from 'react';
import {
  NothingHere,
  useEditModal,
  useToggle,
  useTranslation,
  usePaginatedMaterialTable,
  ColumnDef,
  ColumnType,
  MaterialTable,
} from '@openmsupply-client/common';
import { useName } from '../../api';
import { StoreEditModal } from './StoreEditModal';
import { AppBarButtons } from './AppBarButtons';
import { PropertiesImportModal } from '../ImportProperties/PropertiesImportModal';
import { FacilityNameRowFragment } from '../../api/operations.generated';

export const StoresListView = () => {
  const t = useTranslation();
  const [selectedId, setSelectedId] = useState('');
  const { data, isError, isFetching } = useName.document.stores();
  const { data: properties, isLoading: propertiesLoading } =
    useName.document.properties();

  const { isOpen, onClose, onOpen } = useEditModal<FacilityNameRowFragment>();
  const importPropertiesModalController = useToggle();

  const onRowClick = (row: FacilityNameRowFragment) => {
    setSelectedId(row.id);
    onOpen();
  };

  const columns = useMemo(
    (): ColumnDef<FacilityNameRowFragment>[] => [
      {
        accessorKey: 'code',
        header: t('label.code'),
        enableSorting: true,
        enableColumnFilter: true,
      },
      {
        accessorKey: 'name',
        header: t('label.name'),
        size: 250,
        enableSorting: true,
        enableColumnFilter: true,
      },
      {
        accessorKey: 'isSupplier',
        header: t('label.supplier'),
        columnType: ColumnType.Boolean,
      },
      {
        accessorKey: 'isCustomer',
        header: t('label.customer'),
        columnType: ColumnType.Boolean,
      },
      {
        accessorKey: 'isDonor',
        header: t('label.donor'),
        columnType: ColumnType.Boolean,
      },
    ],
    []
  );

  const { table } = usePaginatedMaterialTable({
    tableId: 'stores-list',
    columns,
    data: data?.nodes,
    totalCount: data?.totalCount ?? 0,
    isLoading: isFetching,
    isError,
    noDataElement: <NothingHere body={t('error.no-stores')} />,
    onRowClick: onRowClick,
    enableRowSelection: false,
  });

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
      {isOpen && (
        <StoreEditModal
          isOpen={isOpen}
          nameId={selectedId}
          onClose={onClose}
          setNextStore={setSelectedId}
        />
      )}
      <MaterialTable table={table} />
    </>
  );
};
