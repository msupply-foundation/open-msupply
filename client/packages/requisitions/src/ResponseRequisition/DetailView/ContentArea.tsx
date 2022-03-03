import React from 'react';
import { DataTable, useTranslation } from '@openmsupply-client/common';
import { useResponseRequisitionColumns } from './columns';
import { useResponseRequisitionLines, ResponseLineFragment } from '../api';

interface ContentAreaProps {
  onRowClick: (line: ResponseLineFragment) => void;
}

export const ContentArea = ({ onRowClick }: ContentAreaProps) => {
  const { lines, onChangeSortBy, sortBy, pagination } =
    useResponseRequisitionLines();
  const columns = useResponseRequisitionColumns({ sortBy, onChangeSortBy });
  const t = useTranslation('common');

  return (
    <DataTable
      onRowClick={onRowClick}
      pagination={{ ...pagination, total: lines.length }}
      columns={columns}
      data={lines}
      onChangePage={pagination.onChangePage}
      noDataMessage={t('error.no-items')}
    />
  );
};
