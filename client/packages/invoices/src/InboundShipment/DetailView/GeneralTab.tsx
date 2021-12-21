import React, { FC, useMemo } from 'react';
import {
  DataTable,
  usePagination,
  DomainObject,
  Box,
  useTranslation,
  useTableStore,
  Grid,
  Switch,
} from '@openmsupply-client/common';
import { InboundShipmentItem, InvoiceLine } from '../../types';
import { useInboundItems, useInboundLines } from './api';
import { useInboundShipmentColumns } from 'packages/invoices/src/InboundShipment/DetailView/columns';

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
  const t = useTranslation(['common', 'replenishment']);

  const lines = useInboundLines();
  const { data: items } = useInboundItems();
  const tableStore = useTableStore();
  const rows = tableStore.isGrouped ? items : lines;

  const paged = useMemo(
    () => rows?.slice(pagination.offset, pagination.offset + pagination.first),
    [rows, pagination.offset, pagination.first]
  );

  const columns = useInboundShipmentColumns();

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
          label={t('label.group-by-item', { ns: 'replenishment' })}
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
