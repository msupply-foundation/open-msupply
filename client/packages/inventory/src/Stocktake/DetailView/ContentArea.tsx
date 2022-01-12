import React, { FC } from 'react';
import {
  DataTable,
  useTranslation,
  Box,
  Switch,
  useIsGrouped,
} from '@openmsupply-client/common';
import { useStocktakeColumns } from './columns';
import { useStocktakeRows } from '../api';
import { StocktakeSummaryItem, StocktakeLine } from '../../types';

const Expand: FC<{ rowData: StocktakeSummaryItem | StocktakeLine }> = ({
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

export const ContentArea: FC<{
  onRowClick: (item: StocktakeSummaryItem | StocktakeLine) => void;
}> = ({ onRowClick }) => {
  const t = useTranslation('inventory');
  const { isGrouped, toggleIsGrouped } = useIsGrouped('inboundShipment');
  const { rows, onChangeSortBy, sortBy } = useStocktakeRows(isGrouped);
  const columns = useStocktakeColumns({ onChangeSortBy, sortBy });

  if (!rows) return null;

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
        ExpandContent={Expand}
        columns={columns}
        data={rows}
        noDataMessage={t('error.no-items')}
      />
    </Box>
  );
};
