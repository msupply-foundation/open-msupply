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
  ifTheSameElseDefault,
  getUnitQuantity,
  getSumOfKeyReducer,
} from '@openmsupply-client/common';
import { InboundShipmentItem } from '../../types';
import { useInboundItems } from './api';

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

  const { data, sortBy, onSort } = useInboundItems();
  const activeRows = data?.filter(({ isDeleted }) => !isDeleted) ?? [];

  const columns = useColumns(
    [
      getNotePopoverColumn<InboundShipmentItem>(),
      [
        'itemCode',
        {
          accessor: ({ rowData: { batches } }) => {
            const lines = Object.values(batches);
            return ifTheSameElseDefault(lines, 'itemCode', '');
          },
        },
      ],
      [
        'itemName',
        {
          accessor: ({ rowData: { batches } }) => {
            const lines = Object.values(batches);
            return ifTheSameElseDefault(lines, 'itemName', '');
          },
        },
      ],
      [
        'batch',
        {
          accessor: ({ rowData: { batches } }) => {
            const lines = Object.values(batches);
            return ifTheSameElseDefault(lines, 'batch', '[multiple]');
          },
        },
      ],
      [
        'expiryDate',
        {
          accessor: ({ rowData: { batches } }) => {
            const lines = Object.values(batches);
            return ifTheSameElseDefault(lines, 'expiryDate', '');
          },
        },
      ],
      [
        'locationName',
        {
          accessor: ({ rowData: { batches } }) => {
            const lines = Object.values(batches);
            return ifTheSameElseDefault(lines, 'locationName', '');
          },
        },
      ],
      [
        'sellPricePerPack',
        {
          accessor: ({ rowData: { batches } }) => {
            const lines = Object.values(batches);
            return ifTheSameElseDefault(lines, 'sellPricePerPack', '');
          },
        },
      ],
      [
        'packSize',
        {
          accessor: ({ rowData: { batches } }) => {
            const lines = Object.values(batches);
            return ifTheSameElseDefault(lines, 'packSize', '');
          },
        },
      ],
      [
        'unitQuantity',
        {
          accessor: ({ rowData: { batches } }) => {
            const lines = Object.values(batches);
            return lines.reduce(getUnitQuantity, 0);
          },
        },
      ],
      [
        'numberOfPacks',
        {
          accessor: ({ rowData: { batches } }) => {
            const lines = Object.values(batches);
            return lines.reduce(getSumOfKeyReducer('numberOfPacks'), 0);
          },
        },
      ],
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
