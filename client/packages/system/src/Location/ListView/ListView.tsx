import React, { useMemo } from 'react';
import {
  useEditModal,
  NothingHere,
  useTranslation,
  useUrlQueryParams,
  UNDEFINED_STRING_VALUE,
  InlineProgress,
  usePaginatedMaterialTable,
  ColumnDef,
  ColumnType,
  MaterialTable,
  CheckCell,
} from '@openmsupply-client/common';
import { LocationRowFragment, useLocationList } from '../api';
import { AppBarButtons } from './AppBarButtons';
import { LocationEditModal } from './LocationEditModal';
import { Footer } from './Footer';

export const LocationListView = () => {
  const {
    queryParams: { sortBy, first, offset, filterBy },
  } = useUrlQueryParams({
    initialSort: { key: 'name', dir: 'asc' },
    filters: [
      {
        key: 'name',
      },
      {
        key: 'onHold',
        condition: '=',
      },
    ],
  });
  const queryParams = { sortBy, first, offset, filterBy };
  const {
    query: { data, isError, isLoading, isFetching },
  } = useLocationList(queryParams);
  const t = useTranslation();

  const { isOpen, entity, mode, onClose, onOpen } =
    useEditModal<LocationRowFragment>();
  const locations = data?.nodes ?? [];

  const columns = useMemo(
    (): ColumnDef<LocationRowFragment>[] => [
      {
        accessorKey: 'code',
        header: t('label.code'),
        enableSorting: true,
      },
      {
        accessorKey: 'name',
        header: t('label.name'),
        enableSorting: true,
        enableColumnFilter: true,
      },
      {
        id: 'locationType',
        header: t('label.location-type'),
        accessorFn: ({ locationType }) =>
          locationType
            ? t('label.location-temperature-range', {
                ...locationType,
                locationName: locationType.name,
              })
            : null,
      },
      {
        accessorKey: 'volume',
        header: t('label.volume'),
        columnType: ColumnType.Number,
      },
      {
        id: 'volumeUsed',
        header: t('label.volume-used'),
        Cell: ({
          row: {
            original: { volume, volumeUsed },
          },
        }) => {
          if (!volume) return UNDEFINED_STRING_VALUE;
          const percentageValue = ((volumeUsed || 0) / volume) * 100;

          return (
            <InlineProgress
              variant="determinate"
              width="150px"
              color={
                percentageValue > 100
                  ? 'error'
                  : percentageValue > 80
                    ? 'warning'
                    : 'secondary'
              }
              value={percentageValue}
            />
          );
        },
      },
      {
        accessorKey: 'onHold',
        header: t('label.on-hold'),
        Cell: CheckCell,
        size: 110,
        enableColumnFilter: true,
        filterVariant: 'select',
        filterSelectOptions: [
          { value: 'true', label: t('label.on-hold') },
          { value: 'false', label: t('label.not-on-hold') },
        ],
      },
    ],
    []
  );

  const { table, selectedRows } = usePaginatedMaterialTable({
    tableId: 'location-list',
    isLoading: isFetching,
    isError,
    columns,
    data: locations,
    totalCount: data?.totalCount ?? 0,
    onRowClick: onOpen,
    noDataElement: (
      <NothingHere body={t('error.no-locations')} onCreate={() => onOpen()} />
    ),
  });

  return (
    <>
      {isOpen && (
        <LocationEditModal
          mode={mode}
          isOpen={isOpen}
          onClose={onClose}
          location={entity}
        />
      )}
      <AppBarButtons
        onCreate={() => onOpen()}
        locations={data?.nodes}
        reportIsLoading={isLoading}
      />
      <MaterialTable table={table} />
      <Footer
        selectedRows={selectedRows}
        resetRowSelection={table.resetRowSelection}
      />
    </>
  );
};
