import React, { useMemo } from 'react';
import {
  useNavigate,
  useTranslation,
  InvoiceNodeStatus,
  NothingHere,
  useToggle,
  useUrlQueryParams,
  MaterialTable,
  usePaginatedMaterialTable,
  ColumnDef,
  ColumnType,
  NameAndColorSetterCell,
} from '@openmsupply-client/common';
import {
  getStatusTranslator,
  isPrescriptionDisabled,
  prescriptionStatuses,
} from '../../utils';
import { usePrescriptionList, usePrescription } from '../api';
import { PrescriptionRowFragment } from '../api/operations.generated';
import { AppBarButtons } from './AppBarButtons';
import { Footer } from './Footer';

export const PrescriptionListView = () => {
  const {
    update: { update },
  } = usePrescription();
  const t = useTranslation();
  const {
    queryParams: { first, offset, sortBy, filterBy },
  } = useUrlQueryParams({
    initialSort: { key: 'prescriptionDatetime', dir: 'desc' },
    filters: [
      { key: 'otherPartyName' },
      { key: 'theirReference' },
      { key: 'invoiceNumber', condition: 'equalTo', isNumber: true },
      {
        key: 'createdOrBackdatedDatetime',
        condition: 'between',
      },
      {
        key: 'status',
        condition: 'equalTo',
      },
    ],
  });
  const listParams = {
    sortBy,
    first,
    offset,
    filterBy,
  };
  const navigate = useNavigate();
  const modalController = useToggle();
  const {
    query: { data, isError, isFetching },
  } = usePrescriptionList(listParams);

  const columns = useMemo(
    (): ColumnDef<PrescriptionRowFragment>[] => [
      {
        accessorKey: 'otherPartyName',
        header: t('label.name'),
        enableSorting: true,
        enableColumnFilter: true,
        Cell: ({ row }) => (
          <NameAndColorSetterCell
            row={row.original}
            onColorChange={update}
            getIsDisabled={isPrescriptionDisabled}
          />
        ),
      },
      {
        accessorKey: 'status',
        header: t('label.status'),
        enableSorting: true,
        enableColumnFilter: true,
        filterVariant: 'select',
        filterSelectOptions: prescriptionStatuses.map(status => ({
          value: status,
          label: getStatusTranslator(t)(status),
        })),
        accessorFn: (row: PrescriptionRowFragment) =>
          getStatusTranslator(t)(row.status as InvoiceNodeStatus),
        size: 120,
      },
      {
        accessorKey: 'invoiceNumber',
        header: t('label.invoice-number'),
        enableSorting: true,
        enableColumnFilter: true,
        size: 110,
      },
      {
        accessorKey: 'prescriptionDatetime',
        header: t('label.prescription-date'),
        columnType: ColumnType.Date,
        enableSorting: true,
        accessorFn: (row: PrescriptionRowFragment) =>
          row.prescriptionDate || row.createdDatetime,
        size: 150,
        enableColumnFilter: true,
        filterKey: 'createdOrBackdatedDatetime',
      },
      {
        accessorKey: 'theirReference',
        header: t('label.reference'),
        enableSorting: true,
        size: 110,
        enableColumnFilter: true,
      },
      {
        accessorKey: 'comment',
        header: t('label.comment'),
        columnType: ColumnType.Comment,
        size: 120,
      },
    ],
    []
  );

  const { table, selectedRows } = usePaginatedMaterialTable({
    tableId: 'prescription-list',
    columns,
    data: data?.nodes,
    totalCount: data?.totalCount ?? 0,
    isLoading: isFetching,
    isError,
    onRowClick: row => {
      navigate(row.id);
    },
    noDataElement: (
      <NothingHere
        body={t('error.no-prescriptions')}
        onCreate={modalController.toggleOn}
      />
    ),
    getIsRestrictedRow: isPrescriptionDisabled,
  });

  return (
    <>
      <AppBarButtons
        modalController={modalController}
        filterBy={filterBy}
        sortBy={sortBy}
      />
      <MaterialTable table={table} />
      <Footer
        selectedRows={selectedRows}
        resetRowSelection={table.resetRowSelection}
      />
    </>
  );
};
