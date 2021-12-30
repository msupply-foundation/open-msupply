import React, { FC, useEffect, useMemo } from 'react';
import {
  DataTable,
  ObjectWithStringKeys,
  usePagination,
  Column,
  DomainObject,
  useTranslation,
  Box,
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
  onFlattenRows: () => void;
  onGroupRows: () => void;
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
> = ({ data, columns, onRowClick, onFlattenRows, onGroupRows }) => {
  // const [isGroupedByItem, setIsGroupedByItem] = useLocalStorage('/groupbyitem');
  const { pagination } = usePagination();
  const t = useTranslation('distribution');
  const { isGrouped, toggleIsGrouped } = useIsGrouped('outboundShipment');

  const activeRows = useMemo(() => {
    const x = data
      .filter(({ isDeleted }) => !isDeleted)
      .slice(pagination.offset, pagination.offset + pagination.first);

    return x;
  }, [data]);

  // const toggleGrouped = () => {
  //   const outboundShipment = !isGroupedByItem?.outboundShipment;
  //   setIsGroupedByItem({
  //     ...isGroupedByItem,
  //     outboundShipment,
  //   });
  //   if (outboundShipment) onGroupRows();
  //   else onFlattenRows();
  // };

  useEffect(() => {
    // set the grouping state for the initial data load
    if (isGrouped) onGroupRows();
    else onFlattenRows();
  }, [isGrouped]);

  return (
    <Box flexDirection="column">
      {activeRows?.length !== 0 && (
        <Box style={{ padding: 5, marginInlineStart: 15 }}>
          <Switch
            label={t('label.group-by-item')}
            onChange={toggleIsGrouped}
            checked={isGrouped}
            size="small"
            disabled={activeRows.length === 0}
            color="secondary"
          />
        </Box>
      )}
      <DataTable
        onRowClick={onRowClick}
        ExpandContent={Expand}
        pagination={{ ...pagination, total: activeRows.length }}
        columns={columns}
        data={activeRows}
        onChangePage={pagination.onChangePage}
        noDataMessage={t('error.no-items')}
      />
    </Box>
  );
};

export const GeneralTab = React.memo(GeneralTabComponent);
