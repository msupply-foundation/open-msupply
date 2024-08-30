import React, { FC } from 'react';
import {
  useTranslation,
  NothingHere,
  useUrlQueryParams,
  Box,
  DataTable,
  MiniTable,
} from '@openmsupply-client/common';
import { usePrescription } from '../api';
import { usePrescriptionColumn } from './columns';
import { useExpansionColumns } from './PrescriptionLineEdit/columns';
import { StockOutItem } from '../../types';
import { StockOutLineFragment } from '../../StockOut';

interface ContentAreaProps {
  onAddItem: () => void;
  onRowClick?: null | ((rowData: StockOutLineFragment | StockOutItem) => void);
}

const Expand: FC<{
  rowData: StockOutLineFragment | StockOutItem;
}> = ({ rowData }) => {
  const expandoColumns = useExpansionColumns();

  if ('lines' in rowData && rowData.lines.length > 1) {
    return <MiniTable rows={rowData.lines} columns={expandoColumns} />;
  } else {
    return null;
  }
};

export const ContentAreaComponent: FC<ContentAreaProps> = ({
  onAddItem,
  onRowClick,
}) => {
  const t = useTranslation('dispensary');
  const {
    updateSortQuery,
    queryParams: { sortBy },
  } = useUrlQueryParams();
  const { rows } = usePrescription.line.rows();
  const columns = usePrescriptionColumn({
    onChangeSortBy: updateSortQuery,
    sortBy,
  });
  const isDisabled = usePrescription.utils.isDisabled();

  if (!rows) return null;

  return (
    <Box flexDirection="column" display="flex" flex={1}>
      <DataTable
        id="prescription-detail"
        onRowClick={onRowClick}
        ExpandContent={Expand}
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
