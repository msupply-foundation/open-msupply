import React, { FC } from 'react';
import {
  DataTable,
  useTranslation,
  Box,
  Switch,
  useIsGrouped,
  MiniTable,
  DataTableSkeleton,
} from '@openmsupply-client/common';
import { useStocktakeColumns, useExpansionColumns } from './columns';
import { useStocktakeRows } from '../api';
import { StocktakeSummaryItem, StocktakeLine } from '../../types';

const Expando = ({
  rowData,
}: {
  rowData: StocktakeLine | StocktakeSummaryItem;
}) => {
  const expandoColumns = useExpansionColumns();
  if ('lines' in rowData && rowData.lines.length > 1) {
    return <MiniTable rows={rowData.lines} columns={expandoColumns} />;
  } else {
    return null;
  }
};

export const ContentArea: FC<{
  onRowClick: (item: StocktakeSummaryItem | StocktakeLine) => void;
}> = ({ onRowClick }) => {
  const t = useTranslation('inventory');
  const { isGrouped, toggleIsGrouped } = useIsGrouped('inboundShipment');
  const { rows, onChangeSortBy, sortBy } = useStocktakeRows(isGrouped);
  const columns = useStocktakeColumns({ onChangeSortBy, sortBy });

  if (!rows) return <DataTableSkeleton hasGroupBy={true} />;

  return (
    <Box flexDirection="column" flex={1}>
      <Box style={{ padding: 5, marginInlineStart: 15 }}>
        <Switch
          label={t('label.group-by-item')}
          onChange={toggleIsGrouped}
          checked={isGrouped}
          size="small"
          disabled={rows?.length === 0}
          color="secondary"
        />
      </Box>
      <DataTable<StocktakeSummaryItem | StocktakeLine>
        onRowClick={onRowClick}
        ExpandContent={Expando}
        columns={columns}
        data={rows}
        noDataMessage={t('error.no-items')}
      />
    </Box>
  );
};
