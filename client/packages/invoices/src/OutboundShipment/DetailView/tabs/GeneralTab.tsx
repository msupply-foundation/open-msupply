import React, { FC } from 'react';
import {
  DataTable,
  ObjectWithStringKeys,
  usePagination,
  Column,
  DomainObject,
  Box,
} from '@openmsupply-client/common';
import { OutboundShipmentSummaryItem } from '../types';

interface GeneralTabProps<T extends ObjectWithStringKeys & DomainObject> {
  data: T[];
  columns: Column<T>[];
  onRowClick?: (rowData: T) => void;
}

const Expand: FC = () => {
  return (
    <Box p={1} height={300}>
      <Box
        flex={1}
        display="flex"
        height="100%"
        borderRadius={4}
        bgcolor="#c7c9d933"
      />
    </Box>
  );
};

export const GeneralTabComponent: FC<
  GeneralTabProps<OutboundShipmentSummaryItem>
> = ({ data, columns, onRowClick }) => {
  const { pagination } = usePagination();
  // const activeRows = data.filter(({ isDeleted }) => !isDeleted);

  return (
    <DataTable
      onRowClick={onRowClick}
      ExpandContent={Expand}
      pagination={{ ...pagination, total: data.length }}
      columns={columns}
      data={data.slice(pagination.offset, pagination.offset + pagination.first)}
      onChangePage={pagination.onChangePage}
      noDataMessageKey="error.no-items"
    />
  );
};

export const GeneralTab = React.memo(GeneralTabComponent);
