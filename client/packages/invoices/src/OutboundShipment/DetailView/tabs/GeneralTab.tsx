import React, { FC, useEffect, useMemo } from 'react';
import {
  DataTable,
  ObjectWithStringKeys,
  usePagination,
  Column,
  DomainObject,
  Box,
  useTranslation,
  Grid,
  Switch,
  alpha,
  useColumns,
  useLocalStorage,
  useTableStore,
} from '@openmsupply-client/common';
import { OutboundShipmentSummaryItem } from '../../../types';

interface GeneralTabProps<T extends ObjectWithStringKeys & DomainObject> {
  data: T[];
  columns: Column<T>[];
  onRowClick?: (rowData: T) => void;
  onFlattenRows: () => void;
  onGroupRows: () => void;
}

const Expand: FC<{
  rowData: OutboundShipmentSummaryItem;
}> = ({ rowData }) => {
  const t = useTranslation();

  const columns = useColumns([
    'batch',
    'expiryDate',
    'locationName',
    'itemUnit',
    'numberOfPacks',
    'packSize',
    'unitQuantity',
    'sellPricePerUnit',
  ]);

  const batches = Object.values(rowData.batches).map(batch => ({
    ...batch,
    unitQuantity: batch.numberOfPacks * batch.packSize,
    sellPricePerUnit: (batch.sellPricePerPack ?? 0) / batch.packSize,
  }));
  const BatchTable = React.useMemo(
    () => (
      <DataTable
        dense
        columns={columns}
        data={batches}
        noDataMessage={t('error.no-items')}
      />
    ),
    []
  );

  if (!rowData?.canExpand) return <></>;

  return (
    <Box p={1} style={{ padding: '0 100px', width: '100%' }}>
      <Box
        flex={1}
        display="flex"
        height="100%"
        borderRadius={4}
        sx={{
          backgroundColor: theme => alpha(theme.palette.gray.light, 0.2),
        }}
      >
        {BatchTable}
      </Box>
    </Box>
  );
};

export const GeneralTabComponent: FC<
  GeneralTabProps<OutboundShipmentSummaryItem>
> = ({ data, columns, onRowClick, onFlattenRows, onGroupRows }) => {
  const [isGroupedByItem, setIsGroupedByItem] = useLocalStorage('/groupbyitem');
  const { pagination } = usePagination();
  const t = useTranslation('distribution');
  const { setIsGrouped } = useTableStore();

  const activeRows = useMemo(() => {
    const x = data
      .filter(({ isDeleted }) => !isDeleted)
      .slice(pagination.offset, pagination.offset + pagination.first);

    return x;
  }, [data]);

  const toggleGrouped = () => {
    const outboundShipment = !isGroupedByItem?.outboundShipment;
    setIsGroupedByItem({
      ...isGroupedByItem,
      outboundShipment,
    });
    if (outboundShipment) onGroupRows();
    else onFlattenRows();
  };

  useEffect(() => {
    setIsGrouped(!!isGroupedByItem?.outboundShipment);
  }, [isGroupedByItem, setIsGrouped]);

  useEffect(() => {
    // set the grouping state for the initial data load
    if (!isGroupedByItem?.outboundShipment) onFlattenRows();
    else onGroupRows();
  }, []);

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
          onChange={toggleGrouped}
          checked={!!isGroupedByItem?.outboundShipment}
          size="small"
          disabled={activeRows.length === 0}
          color="secondary"
        />
      </Grid>
      <Grid item>
        <DataTable
          onRowClick={onRowClick}
          ExpandContent={Expand}
          pagination={{ ...pagination, total: activeRows.length }}
          columns={columns}
          data={activeRows}
          onChangePage={pagination.onChangePage}
          noDataMessage={t('error.no-items')}
        />
      </Grid>
    </Grid>
  );
};

export const GeneralTab = React.memo(GeneralTabComponent);
