import React, { FC, useMemo } from 'react';
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
  useTableStore,
  Grid,
  Switch,
} from '@openmsupply-client/common';
import { InboundShipmentItem, InvoiceLine } from '../../types';
import { useInboundItems, useInboundLines } from './api';

interface GeneralTabProps<T extends DomainObject> {
  onRowClick?: (rowData: T) => void;
}

const Expand: FC<{ rowData: InboundShipmentItem | InvoiceLine }> = ({
  rowData,
}) => {
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

export const GeneralTabComponent: FC<
  GeneralTabProps<InboundShipmentItem | InvoiceLine>
> = ({ onRowClick }) => {
  const { pagination } = usePagination();
  const t = useTranslation('common');

  const lines = useInboundLines();
  const { data: items } = useInboundItems();
  const tableStore = useTableStore();
  const rows = tableStore.isGrouped ? items : lines;

  const paged = useMemo(
    () => rows?.slice(pagination.offset, pagination.offset + pagination.first),
    [rows, pagination.offset, pagination.first]
  );

  const columns = useColumns<InvoiceLine | InboundShipmentItem>(
    [
      {
        ...getNotePopoverColumn(),
        accessor: ({ rowData }) => {
          if ('lines' in rowData) {
            return rowData.lines[0].note;
          } else {
            return rowData.note;
          }
        },
      },
      [
        'itemCode',
        {
          accessor: ({ rowData }) => {
            if ('lines' in rowData) {
              const { lines } = rowData;
              return ifTheSameElseDefault(lines, 'itemCode', '');
            } else {
              return rowData.itemCode;
            }
          },
        },
      ],
      [
        'itemName',
        {
          accessor: ({ rowData }) => {
            if ('lines' in rowData) {
              const { lines } = rowData;
              return ifTheSameElseDefault(lines, 'itemName', '');
            } else {
              return rowData.itemName;
            }
          },
        },
      ],
      [
        'batch',
        {
          accessor: ({ rowData }) => {
            if ('lines' in rowData) {
              const { lines } = rowData;
              return ifTheSameElseDefault(lines, 'batch', '[multiple]');
            } else {
              return rowData.batch;
            }
          },
        },
      ],
      [
        'expiryDate',
        {
          accessor: ({ rowData }) => {
            if ('lines' in rowData) {
              const { lines } = rowData;
              return ifTheSameElseDefault(lines, 'expiryDate', '');
            } else {
              return rowData.expiryDate;
            }
          },
        },
      ],
      [
        'locationName',
        {
          accessor: ({ rowData }) => {
            if ('lines' in rowData) {
              const { lines } = rowData;
              return ifTheSameElseDefault(lines, 'locationName', '');
            } else {
              return rowData?.locationName;
            }
          },
        },
      ],
      [
        'sellPricePerPack',
        {
          accessor: ({ rowData }) => {
            if ('lines' in rowData) {
              const { lines } = rowData;
              return ifTheSameElseDefault(lines, 'sellPricePerPack', '');
            } else {
              return rowData.sellPricePerPack;
            }
          },
        },
      ],
      [
        'packSize',
        {
          accessor: ({ rowData }) => {
            if ('lines' in rowData) {
              const { lines } = rowData;
              return ifTheSameElseDefault(lines, 'packSize', '');
            } else {
              return rowData.packSize;
            }
          },
        },
      ],
      [
        'unitQuantity',
        {
          accessor: ({ rowData }) => {
            if ('lines' in rowData) {
              const { lines } = rowData;
              return lines.reduce(getUnitQuantity, 0);
            } else {
              return rowData.packSize * rowData.numberOfPacks;
            }
          },
        },
      ],
      [
        'numberOfPacks',
        {
          accessor: ({ rowData }) => {
            if ('lines' in rowData) {
              const { lines } = rowData;
              return lines.reduce(getSumOfKeyReducer('numberOfPacks'), 0);
            } else {
              return rowData.numberOfPacks;
            }
          },
        },
      ],
      getRowExpandColumn(),
      GenericColumnKey.Selection,
    ],
    {},
    []
  );

  return (
    <Grid container flexDirection="column" flexWrap="nowrap" width="auto">
      <Grid
        item
        justifyContent="flex-start"
        display="flex"
        flex={0}
        sx={{ padding: '5px', paddingLeft: '15px' }}
      >
        <Switch
          label={t('label.group-by-item')}
          onChange={(_, check) => tableStore.setIsGrouped(check)}
          checked={tableStore.isGrouped}
          size="small"
          disabled={rows?.length === 0}
          color="secondary"
        />
      </Grid>
      <Grid item>
        <DataTable
          onRowClick={onRowClick}
          ExpandContent={Expand}
          pagination={{ ...pagination, total: rows?.length }}
          columns={columns}
          data={paged}
          onChangePage={pagination.onChangePage}
          noDataMessage={t('error.no-items')}
        />
      </Grid>
    </Grid>
  );
};

export const GeneralTab = React.memo(GeneralTabComponent);
