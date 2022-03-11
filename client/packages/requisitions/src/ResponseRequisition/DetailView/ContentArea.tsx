import React from 'react';
import { DataTable, useTranslation } from '@openmsupply-client/common';
import { useResponseLines, ResponseLineFragment } from '../api';

interface ContentAreaProps {
  onRowClick: null | ((line: ResponseLineFragment) => void);
}

export const ContentArea = ({ onRowClick }: ContentAreaProps) => {
  const { columns, lines } = useResponseLines();
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
