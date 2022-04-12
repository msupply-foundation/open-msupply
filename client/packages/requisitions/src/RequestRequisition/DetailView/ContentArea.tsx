import React from 'react';
import { DataTable, useTranslation } from '@openmsupply-client/common';
import {
  RequestLineFragment,
  useHideOverStocked,
  useRequestLines,
} from '../api';

interface ContentAreaProps {
  onRowClick: null | ((line: RequestLineFragment) => void);
}

export const ContentArea = ({ onRowClick }: ContentAreaProps) => {
  const t = useTranslation('common');
  const { lines, columns } = useRequestLines();
  const { on } = useHideOverStocked();
  const { itemFilter } = useRequestLines();

  const isFiltered = !!itemFilter || on;
  return (
    <DataTable
      onRowClick={onRowClick}
      columns={columns}
      data={lines}
      noDataMessage={t(
        isFiltered ? 'error.no-items-filter-on' : 'error.no-items'
      )}
    />
  );
};
