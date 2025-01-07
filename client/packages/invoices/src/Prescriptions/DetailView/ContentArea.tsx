import React, { FC } from 'react';
import {
  useTranslation,
  NothingHere,
  useUrlQueryParams,
  Box,
  DataTable,
} from '@openmsupply-client/common';
import { usePrescription } from '../api';
import { usePrescriptionColumn } from './columns';
import { StockOutItem } from '../../types';
import { StockOutLineFragment } from '../../StockOut';

interface ContentAreaProps {
  onAddItem: () => void;
  onRowClick?: null | ((rowData: StockOutLineFragment | StockOutItem) => void);
}

export const ContentAreaComponent: FC<ContentAreaProps> = ({
  onAddItem,
  onRowClick,
}) => {
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
    <Box flexDirection="column" display="flex" flex={1}>
      <DataTable
        id="prescription-detail"
        onRowClick={onRowClick}
        // ExpandContent={Expand}
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
    </Box>
  );
};

export const ContentArea = React.memo(ContentAreaComponent);
