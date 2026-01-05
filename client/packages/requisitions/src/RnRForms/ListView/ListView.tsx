import React, { useMemo } from 'react';
import {
  useUrlQueryParams,
  useNavigate,
  NothingHere,
  useTranslation,
  useEditModal,
  MaterialTable,
  ColumnDef,
  ColumnType,
  usePaginatedMaterialTable,
} from '@openmsupply-client/common';
import { AppBarButtons } from './AppBarButtons';
import { useRnRFormList } from '../api';
import { RnRFormFragment } from '../api/operations.generated';
import { RnRFormCreateModal } from './RnRFormCreateModal';
import { getStatusTranslator, isRnRFormDisabled } from '../utils';
import { Footer } from './Footer';

export const RnRFormListView = () => {
  const t = useTranslation();
  const navigate = useNavigate();
  const { isOpen, onClose, onOpen } = useEditModal();
  const {
    queryParams,
  } = useUrlQueryParams({
    filters: [{ key: 'name' }],
    initialSort: { key: 'createdDatetime', dir: 'desc' },
  });

  const { data, isLoading, isError } = useRnRFormList(queryParams);

  const columns = useMemo(
    (): ColumnDef<RnRFormFragment>[] => [
      {
        id: 'name',
        accessorFn: row => row.periodName,
        header: t('label.period'),
        enableSorting: true,
      },
      {
        accessorKey: 'createdDatetime',
        header: t('label.created'),
        columnType: ColumnType.Date,
        enableSorting: true,
      },
      {
        accessorKey: 'programName',
        header: t('label.program-name'),
        enableSorting: true,
      },
      {
        accessorKey: 'supplierName',
        header: t('label.supplier'),
        enableSorting: true,
      },
      {
        accessorKey: 'status',
        header: t('label.status'),
        Cell: ({ row: { original: row } }) => getStatusTranslator(t)(row.status),
      }
    ],
    []
  );

  const { table, selectedRows } = usePaginatedMaterialTable<RnRFormFragment>({
    tableId: 'rnr-form-list',
    columns,
    data: data?.nodes,
    totalCount: data?.totalCount ?? 0,
    isLoading,
    isError,
    onRowClick: row => navigate(row.id),
    getIsRestrictedRow: isRnRFormDisabled,
    enableRowSelection: row => !isRnRFormDisabled(row.original),
    noDataElement: <NothingHere body={t('error.no-rnr-forms')} onCreate={onOpen} />,
  });

  return (
    <>
      {isOpen && <RnRFormCreateModal isOpen={isOpen} onClose={onClose} />}
      <AppBarButtons onCreate={onOpen} />
      <MaterialTable table={table} />
      <Footer selectedRows={selectedRows} resetRowSelection={table.resetRowSelection} />
    </>
  );
};
