import React, { FC, useEffect } from 'react';
import {
  DataTable,
  useTranslation,
  Box,
  Switch,
  useIsGrouped,
  MiniTable,
  createQueryParamsStore,
  NothingHere,
  useRowStyle,
  AppSxProp,
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

const isUncounted = (line: StocktakeLineFragment): boolean =>
  line.countedNumberOfPacks === null;

const useHighlightUncountedRows = (
  rows: StocktakeLineFragment[] | StocktakeSummaryItem[] | undefined
) => {
  const { setRowStyles } = useRowStyle();

  useEffect(() => {
    if (!rows) return;
    const placeholders = [];

    // This is a verbose .filter() on `rows` to find the placeholder lines.
    // There is an issue with using `filter()` on a type which is
    // A[] | B[]
    // https://github.com/microsoft/TypeScript/issues/44373
    for (const row of rows) {
      if ('lines' in row) {
        const hasPlaceholder = row.lines.some(isUncounted);
        if (hasPlaceholder) {
          // Add both the OutboundItem and the individual lines, as
          // this will cause the item to be highlighted as well as the
          // lines within the expansion when grouped.
          row.lines.forEach(line => {
            if (isUncounted(line)) {
              placeholders.push(line.id);
            }
          });
          placeholders.push(row.id);
        }
      } else {
        if (isUncounted(row)) {
          placeholders.push(row.id);
        }
      }
    }

    const style: AppSxProp = {
      color: theme => theme.palette.secondary.light,
    };
    setRowStyles(placeholders, style);
  }, [rows, setRowStyles]);
};

export const ContentArea: FC<ContentAreaProps> = ({
  onAddItem,
  onRowClick,
}) => {
  const t = useTranslation('inventory');
  const { isGrouped, toggleIsGrouped } = useIsGrouped('stocktake');
  const { rows, onChangeSortBy, sortBy } = useStocktake.line.rows(isGrouped);
  const columns = useStocktakeColumns({ onChangeSortBy, sortBy });
  const isDisabled = useStocktake.utils.isDisabled();

  useHighlightUncountedRows(rows);

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
        key="stocktake-detail"
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
