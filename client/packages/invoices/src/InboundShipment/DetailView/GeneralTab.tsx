import React, { FC, useMemo } from 'react';
import {
  DataTable,
  usePagination,
  DomainObject,
  useTranslation,
  useTableStore,
  Grid,
  Switch,
  MiniTable,
} from '@openmsupply-client/common';
import { InboundShipmentItem, InvoiceLine } from '../../types';
import { useInboundItems, useInboundLines } from './api';
import { useExpansionColumns, useInboundShipmentColumns } from './columns';

interface GeneralTabProps<T extends DomainObject> {
  onRowClick?: (rowData: T) => void;
}

const Expando = ({
  rowData,
}: {
  rowData: InvoiceLine | InboundShipmentItem;
}) => {
  const expandoColumns = useExpansionColumns();
  if ('lines' in rowData && rowData.lines.length > 1) {
    return <MiniTable rows={rowData.lines} columns={expandoColumns} />;
  } else {
    return null;
  }
};

export const GeneralTab: FC<
  GeneralTabProps<InboundShipmentItem | InvoiceLine>
> = React.memo(({ onRowClick }) => {
  const { pagination } = usePagination();
  const t = useTranslation(['common', 'replenishment']);
  const columns = useInboundShipmentColumns();
  const lines = useInboundLines();
  const { data: items } = useInboundItems();
  const tableStore = useTableStore();
  const rows = tableStore.isGrouped ? items : lines;

  const paged = useMemo(
    () => rows?.slice(pagination.offset, pagination.offset + pagination.first),
    [rows, pagination.offset, pagination.first]
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
          ExpandContent={Expando}
          pagination={{ ...pagination, total: rows?.length }}
          columns={columns}
          data={paged}
          onChangePage={pagination.onChangePage}
          noDataMessage={t('error.no-items')}
        />
      </Grid>
    </Grid>
  );
});
