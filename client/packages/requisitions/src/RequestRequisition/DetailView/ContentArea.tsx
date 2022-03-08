import React from 'react';
import { DataTable, useTranslation } from '@openmsupply-client/common';
import { useRequestColumns } from './columns';
import { useRequestLines, RequestLineFragment } from '../api';

interface ContentAreaProps {
  onRowClick: null | ((line: RequestLineFragment) => void);
}

export const ContentArea = ({ onRowClick }: ContentAreaProps) => {
  const { lines, onChangeSortBy, sortBy } = useRequestLines();
  const columns = useRequestColumns({ sortBy, onChangeSortBy });
  const t = useTranslation('common');

  return (
    <DataTable
      onRowClick={onRowClick}
      columns={columns}
      data={lines}
      noDataMessage={t('error.no-items')}
    />
  );
};
