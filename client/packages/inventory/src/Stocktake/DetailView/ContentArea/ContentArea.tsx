import React, { FC } from 'react';
import {
  useTranslation,
  NothingHere,
  MaterialTable,
  useNonPaginatedMaterialTable,
  Groupable,
} from '@openmsupply-client/common';
import { useStocktakeColumns } from './columns';
import { StocktakeLineFragment, useStocktakeOld } from '../../api';
import { StocktakeSummaryItem } from '../../../types';

interface ContentAreaProps {
  onAddItem: () => void;
  onRowClick:
    | undefined
    | ((item: StocktakeSummaryItem | StocktakeLineFragment) => void);
}

const isUncounted = (line: StocktakeLineFragment): boolean =>
  line.countedNumberOfPacks === null;

export const ContentArea: FC<ContentAreaProps> = ({
  onAddItem,
  onRowClick,
}) => {
  const t = useTranslation();
  const { isDisabled, isLoading, lines } = useStocktakeOld.line.rows();
  const columns = useStocktakeColumns();

  const { table } = useNonPaginatedMaterialTable<
    Groupable<StocktakeLineFragment>
  >({
    tableId: 'stocktake-detail',
    columns,
    isLoading,
    data: lines || [],
    onRowClick,
    groupByField: 'itemName',
    initialSort: { key: 'itemName', dir: 'asc' },
    getIsPlaceholderRow: row =>
      !!(
        isUncounted(row) ||
        // Also mark parent rows as placeholder if any subRows are placeholders
        row.subRows?.some(isUncounted)
      ),
    noDataElement: (
      <NothingHere
        body={t('error.no-stocktake-items')}
        onCreate={isDisabled ? undefined : onAddItem}
        buttonText={t('button.add-item')}
      />
    ),
  });

  return <MaterialTable table={table} />;
};
