import React, { FC } from 'react';
import {
  DataTable,
  usePagination,
  DomainObject,
  Box,
  useTranslation,
  useColumns,
  getNotePopoverColumn,
  getRowExpandColumn,
  GenericColumnKey,
} from '@openmsupply-client/common';
import { InboundShipmentItem } from '../../types';
import { useInboundLines } from './api';

interface GeneralTabProps<T extends DomainObject> {
  onRowClick?: (rowData: T) => void;
}

const Expand: FC<{ rowData: InboundShipmentItem }> = ({ rowData }) => {
  return (
    <Box p={1} height={300} style={{ overflow: 'scroll' }}>
      <Box
        flex={1}
        display="flex"
        height="100%"
        borderRadius={4}
        bgcolor="#c7c9d933"
      >
        <span style={{ whiteSpace: 'pre-wrap' }}>
          {JSON.stringify(rowData, null, 2)}
        </span>
      </Box>
    </Box>
  );
};

export const GeneralTabComponent: FC<GeneralTabProps<InboundShipmentItem>> = ({
  onRowClick,
}) => {
  const { pagination } = usePagination();
  const t = useTranslation('common');

  const { data, sortBy, onSort } = useInboundLines();
  const activeRows = data?.filter(({ isDeleted }) => !isDeleted) ?? [];

  const columns = useColumns(
    [
      getNotePopoverColumn<InboundShipmentItem>(),
      'itemCode',
      'itemName',
      'batch',
      'expiryDate',
      'locationName',
      'sellPricePerPack',
      'packSize',
      'itemUnit',
      'unitQuantity',
      'numberOfPacks',
      getRowExpandColumn<InboundShipmentItem>(),
      GenericColumnKey.Selection,
    ],
    { onChangeSortBy: onSort, sortBy },
    [sortBy]
  );

  return (
    <DataTable
      onRowClick={onRowClick}
      ExpandContent={Expand}
      pagination={{ ...pagination, total: activeRows.length }}
      columns={columns}
      data={activeRows.slice(
        pagination.offset,
        pagination.offset + pagination.first
      )}
      onChangePage={pagination.onChangePage}
      noDataMessage={t('error.no-items')}
    />
  );
};

export const GeneralTab = React.memo(GeneralTabComponent);
