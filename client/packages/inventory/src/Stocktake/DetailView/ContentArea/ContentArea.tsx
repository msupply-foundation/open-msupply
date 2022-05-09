import React, { FC } from 'react';
import {
  DataTable,
  useTranslation,
  Box,
  Switch,
  useIsGrouped,
  MiniTable,
  createQueryParamsStore,
} from '@openmsupply-client/common';
import { useStocktakeColumns, useExpansionColumns } from './columns';
import { StocktakeLineFragment, useStocktakeRows } from '../../api';
import { StocktakeSummaryItem } from '../../../types';

const Expando = ({
  rowData,
}: {
  rowData: StocktakeSummaryItem | StocktakeLineFragment;
}) => {
  const expandoColumns = useExpansionColumns();

  if ('lines' in rowData && rowData.lines.length > 1) {
    return (
      <MiniTable
        rows={rowData.lines}
        columns={expandoColumns}
        queryParamsStore={createQueryParamsStore<StocktakeLineFragment>({
          initialSortBy: { key: 'expiryDate' },
        })}
      />
    );
  } else {
    return null;
  }
};

interface ContentAreaProps {
  onRowClick:
    | null
    | ((item: StocktakeSummaryItem | StocktakeLineFragment) => void);
}

export const ContentArea: FC<ContentAreaProps> = ({ onRowClick }) => {
  const t = useTranslation('inventory');
  const { isGrouped, toggleIsGrouped } = useIsGrouped('inboundShipment');
  const { rows, onChangeSortBy, sortBy } = useStocktakeRows(isGrouped);
  const columns = useStocktakeColumns({ onChangeSortBy, sortBy });

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
      <DataTable<StocktakeSummaryItem | StocktakeLineFragment>
        onRowClick={onRowClick}
        ExpandContent={Expando}
        columns={columns}
        data={rows}
        noDataMessage={t('error.no-items')}
      />
    </Box>
  );
};
