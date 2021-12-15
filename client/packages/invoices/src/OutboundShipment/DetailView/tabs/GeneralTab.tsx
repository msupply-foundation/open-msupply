import React, { FC, useEffect, useMemo, useState } from 'react';
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
  ifTheSameElseDefault,
  useTableStore,
} from '@openmsupply-client/common';
import { OutboundShipmentSummaryItem } from '../../../types';

interface GeneralTabProps<T extends ObjectWithStringKeys & DomainObject> {
  data: T[];
  columns: Column<T>[];
  onRowClick?: (rowData: T) => void;
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
    'lineTotal',
  ]);

  const batches = Object.values(rowData.batches).map(batch => ({
    ...batch,
    unitQuantity: batch.numberOfPacks * batch.packSize,
    sellPricePerUnit: (batch.sellPricePerPack ?? 0) / batch.packSize,
    lineTotal: (batch.sellPricePerPack ?? 0) * batch.numberOfPacks,
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
    <Box p={1} style={{ padding: '0 100px 0 100px' }}>
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
> = ({ data, columns, onRowClick }) => {
  const { pagination } = usePagination();
  const [isGroupedByItem, setIsGroupedByItem] = useState(false);

  const [grouped, setGrouped] = useState<OutboundShipmentSummaryItem[]>([]);
  const paged = data.slice(
    pagination.offset,
    pagination.offset + pagination.first
  );

  useEffect(() => {
    const newGrouped: OutboundShipmentSummaryItem[] = [];
    paged.forEach(row => {
      const batches = Object.values(row.batches);
      const lineTotal = (row.sellPricePerPack ?? 0) * (row.numberOfPacks ?? 0);

      if (isGroupedByItem) {
        newGrouped.push({
          ...row,
          lineTotal,
          sellPricePerUnit: lineTotal / row.unitQuantity,
          // batch: ifTheSameElseDefault(batches, 'batch', '[multiple]'),
          // expiryDate: ifTheSameElseDefault(batches, 'expiryDate', '[multiple]'),
          canExpand: Object.keys(row.batches).length > 1,
        });
      } else {
        batches.forEach(batch => {
          newGrouped.push({
            ...row,
            batch: batch.batch,
            expiryDate: batch.expiryDate,
            packSize: batch.packSize,
            lineTotal,
            sellPricePerUnit: lineTotal / row.unitQuantity,
            canExpand: false,
          });
        });
      }
    });
    setGrouped(newGrouped);
  }, [isGroupedByItem, data]);

  const t = useTranslation('distribution');
  const activeRows = useMemo(
    () => grouped.filter(({ isDeleted }) => !isDeleted),
    [grouped]
  );
  const { setIsGrouped } = useTableStore();
  const toggleGrouped = () => {
    setIsGrouped(!isGroupedByItem);
    setIsGroupedByItem(!isGroupedByItem);
  };

  return (
    <Grid container flexDirection="column" flexWrap="nowrap">
      <Grid
        item
        justifyContent="flex-end"
        display="flex"
        flex={0}
        sx={{ padding: '5px', paddingRight: '15px', width: '100%' }}
      >
        <Switch
          label={t('label.group-by-item')}
          onChange={toggleGrouped}
          checked={isGroupedByItem}
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
