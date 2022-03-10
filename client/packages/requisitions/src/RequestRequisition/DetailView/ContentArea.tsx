import React from 'react';
import { DataTable, useTranslation } from '@openmsupply-client/common';
import { RequestLineFragment, useRequestLines } from '../api';

interface ContentAreaProps {
  onRowClick: null | ((line: RequestLineFragment) => void);
}

export const ContentArea = ({ onRowClick }: ContentAreaProps) => {
  const t = useTranslation('common');
  const { lines, columns } = useRequestLines();
  return (
    <DataTable
      onRowClick={onRowClick}
      columns={columns}
      data={lines}
      noDataMessage={t('error.no-items')}
    />
  );
};
