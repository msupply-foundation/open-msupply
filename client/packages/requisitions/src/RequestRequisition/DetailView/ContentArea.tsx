import React from 'react';
import { DataTable, useTranslation } from '@openmsupply-client/common';
import { useRequestRequisitionColumns } from './columns';
import {
  useRequestRequisitionLines,
  RequestRequisitionLineFragment,
} from '../api';

interface ContentAreaProps {
  onRowClick: (line: RequestRequisitionLineFragment) => void;
}

export const ContentArea = ({ onRowClick }: ContentAreaProps) => {
  const { lines, onChangeSortBy, sortBy, pagination } =
    useRequestRequisitionLines();
  const columns = useRequestRequisitionColumns({ sortBy, onChangeSortBy });
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
