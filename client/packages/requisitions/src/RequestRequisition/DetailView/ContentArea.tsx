import React, { FC } from 'react';
import { Column, DataTable, useTranslation } from '@openmsupply-client/common';
import { RequestLineFragment } from '../api';

interface ContentAreaProps {
  columns: Column<RequestLineFragment>[];
  lines: RequestLineFragment[];
  onRowClick: null | ((line: RequestLineFragment) => void);
}

export const ContentArea: FC<ContentAreaProps> = ({
  columns,
  lines,
  onRowClick,
}) => {
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
