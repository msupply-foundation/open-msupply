import React, { FC } from 'react';
import {
  DataTable,
  useTranslation,
  Box,
  Switch,
  useIsGrouped,
  MiniTable,
  createQueryParamsStore,
  NothingHere,
} from '@openmsupply-client/common';
import { useStocktakeColumns, useExpansionColumns } from './columns';
import { StocktakeLineFragment, useStocktake } from '../../api';
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
  onAddItem: () => void;
}

export const ContentArea: FC<ContentAreaProps> = ({
  onAddItem,
  onRowClick,
}) => {
  const t = useTranslation('inventory');
  const { isGrouped, toggleIsGrouped } = useIsGrouped('inboundShipment');
  const { rows, onChangeSortBy, sortBy } = useStocktake.line.rows(isGrouped);
  const columns = useStocktakeColumns({ onChangeSortBy, sortBy });
  const isDisabled = useStocktake.utils.isDisabled();

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
        noDataElement={
          <NothingHere
            body={t('error.no-stocktake-items')}
            onCreate={isDisabled ? undefined : onAddItem}
            buttonText={t('button.add-item')}
          />
        }
      />
    </Box>
  );
};
