import React from 'react';
import { DataTable, useTranslation } from '@openmsupply-client/common';
import { useMasterListLines } from '../api';

export const ContentArea = () => {
  const t = useTranslation('common');
  const { lines, columns } = useMasterListLines();
  return (
    <DataTable
      columns={columns}
      data={lines}
      noDataMessage={t('error.no-items')}
    />
  );
};
