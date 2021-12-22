import React, { FC, useEffect, useMemo, useState } from 'react';
import {
  DataTable,
  ObjectWithStringKeys,
  usePagination,
  Column,
  DomainObject,
  useTranslation,
  Grid,
  Switch,
  useColumns,
  MiniTable,
  useIsGrouped,
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

  const batches = React.useMemo(
    () =>
      Object.values(rowData.batches).map(batch => ({
        ...batch,
        unitQuantity: batch.numberOfPacks * batch.packSize,
        sellPricePerUnit: (batch.sellPricePerPack ?? 0) / batch.packSize,
      })),
    [rowData.batches]
  );

  if (!rowData.canExpand) return null;

  return <MiniTable rows={batches} columns={columns} />;
};

export const GeneralTabComponent: FC<
  GeneralTabProps<OutboundShipmentSummaryItem>
> = ({ data, columns, onRowClick }) => {
  const { pagination } = usePagination();
  const [grouped, setGrouped] = useState<OutboundShipmentSummaryItem[]>([]);
  const t = useTranslation('distribution');
  const { isGrouped, toggleIsGrouped } = useIsGrouped('outboundShipment');

  const paged = data.slice(
    pagination.offset,
    pagination.offset + pagination.first
  );

  const activeRows = useMemo(
    () => grouped.filter(({ isDeleted }) => !isDeleted),
    [grouped]
  );

  useEffect(() => {
    if (!!isGrouped) {
      setGrouped(paged);
    } else {
      const newGrouped: OutboundShipmentSummaryItem[] = [];
      paged.forEach(row => {
        const batches = Object.values(row.batches);
        const lineTotal =
          (row.sellPricePerPack ?? 0) * (row.numberOfPacks ?? 0);

        batches.forEach(batch => {
          newGrouped.push({
            ...row,
            id: batch.id,
            numberOfPacks: batch.numberOfPacks,
            unitQuantity: batch.numberOfPacks * batch.packSize,
            locationName: batch.locationName,
            batch: batch.batch,
            expiryDate: batch.expiryDate,
            packSize: batch.packSize,
            lineTotal,
            sellPricePerUnit: lineTotal / row.unitQuantity,
            canExpand: false,
          });
        });
        setGrouped(newGrouped);
      });
    }
  }, [isGrouped, data]);

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
          onChange={toggleIsGrouped}
          checked={isGrouped}
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
