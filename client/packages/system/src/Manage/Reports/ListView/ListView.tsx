import React, { useMemo, useState } from 'react';
import {
  NothingHere,
  useUrlQueryParams,
  useTranslation,
  useEditModal,
  usePaginatedMaterialTable,
  ColumnDef,
  ColumnType,
  MaterialTable,
} from '@openmsupply-client/common';
import { AppBarButtons } from './AppBarButtons';
import { useCentralReports } from '../api/hooks/useAllReportVersionsList';
import { ReportUploadModal } from './ReportUploadModal';
import { ReportEditModal } from './ReportEditModal';
import { ReportWithVersionRowFragment } from '../api/operations.generated';

export const ReportsList = () => {
  const t = useTranslation();
  const {
    queryParams: { sortBy, first, offset, filterBy },
  } = useUrlQueryParams({
    initialSort: { key: 'code', dir: 'asc' },
    filters: [
      { key: 'name' },
      { key: 'isActive', condition: '=' },
    ],
  });

  const queryParams = {
    sortBy: sortBy.key ? sortBy : undefined,
    first,
    offset,
    filterBy,
  };
  const {
    query: { data, isError, isFetching },
    install: { installMutation },
    update: { updateMutation, updateLoading },
  } = useCentralReports({
    queryParams,
  });

  const { isOpen, onClose, onOpen } = useEditModal();
  const [editingReport, setEditingReport] =
    useState<ReportWithVersionRowFragment | null>(null);

  const columns = useMemo(
    (): ColumnDef<ReportWithVersionRowFragment>[] => [
      {
        accessorKey: 'name',
        header: t('label.name'),
        enableSorting: true,
        enableColumnFilter: true,
      },
      {
        accessorKey: 'code',
        header: t('label.code'),
        enableSorting: true,
      },
      {
        accessorKey: 'version',
        header: t('label.version'),
        enableSorting: true,
      },
      {
        id: 'isActive',
        header: t('label.status'),
        accessorFn: row =>
          row.isActive ? t('label.active') : t('label.inactive'),
        enableColumnFilter: true,
        filterVariant: 'select',
        filterSelectOptions: [
          {
            label: t('label.inactive'),
            value: 'false',
          },
          {
            label: t('label.active'),
            value: 'true',
          },
        ],
      },
      {
        accessorKey: 'isCustom',
        header: t('label.custom'),
        columnType: ColumnType.Boolean,
      },
    ],
    []
  );

  const { table } = usePaginatedMaterialTable({
    tableId: 'reports-list',
    columns,
    data: data?.nodes,
    totalCount: data?.totalCount ?? 0,
    isLoading: isFetching,
    isError,
    noDataElement: <NothingHere body={t('error.no-reports')} />,
    enableRowSelection: false,
    onRowClick: row => setEditingReport(row),
  });

  return (
    <>
      <AppBarButtons onOpen={onOpen} />
      {isOpen && (
        <ReportUploadModal
          isOpen={isOpen}
          onClose={onClose}
          install={installMutation}
        />
      )}
      {editingReport && (
        <ReportEditModal
          isOpen
          report={editingReport}
          onClose={() => setEditingReport(null)}
          update={updateMutation}
          isUpdating={updateLoading}
        />
      )}
      <MaterialTable table={table} />
    </>
  );
};
