import React from 'react';
import { DataTable, useTranslation } from '@openmsupply-client/common';
import { useResponseColumns } from './columns';
import { useResponseLines, ResponseLineFragment } from '../api';

interface ContentAreaProps {
  onRowClick: (line: ResponseLineFragment) => void;
}

export const ContentArea = ({ onRowClick }: ContentAreaProps) => {
  const { lines, onChangeSortBy, sortBy } = useResponseLines();
  const columns = useResponseColumns({ sortBy, onChangeSortBy });
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
