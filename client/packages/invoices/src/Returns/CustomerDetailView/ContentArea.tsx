import React, { FC } from 'react';
import {
  DataTable,
  useTranslation,
  Box,
  NothingHere,
  useUrlQueryParams,
  MiniTable,
} from '@openmsupply-client/common';
import { useExpansionColumns, useCustomerReturnColumns } from './columns';
import { CustomerReturnLineFragment, useReturns } from '../api';
import { CustomerReturnItem } from '../../types';

interface ContentAreaProps {
  onAddItem: () => void;
  onRowClick?:
    | null
    | ((rowData: CustomerReturnLineFragment | CustomerReturnItem) => void);
}

const Expand: FC<{
  rowData: CustomerReturnLineFragment | CustomerReturnItem;
}> = ({ rowData }) => {
  const expandoColumns = useExpansionColumns();

  if ('lines' in rowData && rowData.lines.length > 1) {
    return <MiniTable rows={rowData.lines} columns={expandoColumns} />;
  } else {
    return null;
  }
};

export const ContentAreaComponent: FC<ContentAreaProps> = ({
  onRowClick,
  onAddItem,
}) => {
  const t = useTranslation('distribution');
  const {
    updateSortQuery,
    queryParams: { sortBy },
  } = useUrlQueryParams();
  const { rows } = useReturns.lines.customerReturnRows();
  const columns = useCustomerReturnColumns({
    onChangeSortBy: updateSortQuery,
    sortBy,
  });
  const isDisabled = useReturns.utils.customerIsDisabled();

  if (!rows) return null;

  return (
    <Box flexDirection="column" style={{ width: '100%' }} display="flex">
      <Box flex={1} style={{ overflowY: 'auto' }}>
        <DataTable
          id="customer-return-detail"
          onRowClick={onRowClick}
          ExpandContent={Expand}
          columns={columns}
          data={rows}
          enableColumnSelection
          noDataElement={
            <NothingHere
              body={t('error.no-customer-return-items')}
              onCreate={isDisabled ? undefined : () => onAddItem()}
              buttonText={t('button.add-item')}
            />
          }
          isRowAnimated={true}
        />
      </Box>
    </Box>
  );
};

export const ContentArea = React.memo(ContentAreaComponent);
