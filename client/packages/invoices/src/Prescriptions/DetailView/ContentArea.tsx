import React from 'react';
import {
  useTranslation,
  NothingHere,
  useUrlQueryParams,
  DataTable,
} from '@openmsupply-client/common';
import { usePrescription } from '../api';
import { usePrescriptionColumn } from './columns';
import { StockOutLineFragment } from '../../StockOut';

interface ContentAreaProps {
  onAddItem: () => void;
  onRowClick?: null | ((rowData: StockOutLineFragment) => void);
}

export const ContentAreaComponent = ({
  onAddItem,
  onRowClick,
}: ContentAreaProps) => {
  const t = useTranslation();
  const {
    updateSortQuery,
    queryParams: { sortBy },
  } = useUrlQueryParams();
  const { isDisabled, rows } = usePrescription();
  const columns = usePrescriptionColumn({
    onChangeSortBy: updateSortQuery,
    sortBy,
  });

  if (!rows) return null;

  return (
    <DataTable
      id="prescription-detail"
      onRowClick={onRowClick}
      columns={columns}
      data={rows}
      enableColumnSelection
      noDataElement={
        <NothingHere
          body={t('error.no-prescriptions')}
          onCreate={isDisabled ? undefined : () => onAddItem()}
          buttonText={t('button.add-item')}
        />
      }
      isRowAnimated={true}
    />
  );
};

export const ContentArea = React.memo(ContentAreaComponent);
