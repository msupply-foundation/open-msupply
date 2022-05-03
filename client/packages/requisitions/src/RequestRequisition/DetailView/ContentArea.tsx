import React from 'react';
import {
  DataTable,
  NothingHere,
  useTranslation,
} from '@openmsupply-client/common';
import {
  RequestLineFragment,
  useHideOverStocked,
  useRequestLines,
} from '../api';

interface ContentAreaProps {
  onAddItem: () => void;
  onRowClick: null | ((line: RequestLineFragment) => void);
}

export const ContentArea = ({ onAddItem, onRowClick }: ContentAreaProps) => {
  const t = useTranslation('replenishment');
  const { lines, columns } = useRequestLines();
  const { on } = useHideOverStocked();
  const { itemFilter } = useRequestLines();

  const isFiltered = !!itemFilter || on;
  return (
    <DataTable
      onRowClick={onRowClick}
      columns={columns}
      data={lines}
      noDataElement={
        <NothingHere
          body={t(
            isFiltered
              ? 'error.no-items-filter-on'
              : 'error.no-requisition-items'
          )}
          onCreate={onAddItem}
          buttonText={t('button.add-item')}
        />
      }
    />
  );
};
