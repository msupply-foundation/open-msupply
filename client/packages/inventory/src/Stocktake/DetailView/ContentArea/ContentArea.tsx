import React, { FC, useEffect } from 'react';
import {
  DataTable,
  useTranslation,
  Box,
  MiniTable,
  createQueryParamsStore,
  NothingHere,
  useRowStyle,
  placeholderRowStyle,
  useUrlQueryParams,
  BasicSpinner,
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
  onAddItem: () => void;
  onRowClick:
    | null
    | ((item: StocktakeSummaryItem | StocktakeLineFragment) => void);
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

    setRowStyles(placeholders, placeholderRowStyle);
  }, [rows, setRowStyles]);
};

export const ContentArea: FC<ContentAreaProps> = ({
  onAddItem,
  onRowClick,
}) => {
  const t = useTranslation('inventory');
  const {
    updateSortQuery: onChangeSortBy,
    updatePaginationQuery,
    queryParams: { page, first, offset, sortBy },
  } = useUrlQueryParams({ initialSort: { key: 'itemName', dir: 'asc' } });
  const { isDisabled, isLoading, rows, totalLineCount } =
    useStocktake.line.rows();
  const columns = useStocktakeColumns({ onChangeSortBy, sortBy });
  const pagination = { page, first, offset };

  useHighlightUncountedRows(rows);

  return isLoading ? (
    <BasicSpinner />
  ) : (
    <Box flexDirection="column" flex={1} display="flex">
      <DataTable<StocktakeSummaryItem | StocktakeLineFragment>
        onRowClick={onRowClick}
        ExpandContent={Expando}
        isRowAnimated={true}
        columns={columns}
        data={rows}
        id="stocktake-detail"
        noDataElement={
          <NothingHere
            body={t('error.no-stocktake-items')}
            onCreate={isDisabled ? undefined : onAddItem}
            buttonText={t('button.add-item')}
          />
        }
        enableColumnSelection
        pagination={{ ...pagination, total: totalLineCount }}
        onChangePage={updatePaginationQuery}
      />
    </Box>
  );
};
