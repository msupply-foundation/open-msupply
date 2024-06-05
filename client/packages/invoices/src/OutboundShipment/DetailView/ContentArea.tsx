import React, { FC, useEffect } from 'react';
import {
  DataTable,
  useTranslation,
  Box,
  MiniTable,
  useIsGrouped,
  InvoiceLineNodeType,
  useRowStyle,
  AppSxProp,
  NothingHere,
  useUrlQueryParams,
} from '@openmsupply-client/common';
import { useOutbound } from '../api';
import { useOutboundColumns } from './columns';
import { StockOutLineFragment } from '../../StockOut';
import { StockOutItem } from '../../types';
import { useExpansionColumns } from './OutboundLineEdit/columns';

interface ContentAreaProps {
  onAddItem: () => void;
  onRowClick?: null | ((rowData: StockOutLineFragment | StockOutItem) => void);
}

const Expand: FC<{
  rowData: StockOutLineFragment | StockOutItem;
}> = ({ rowData }) => {
  const expandoColumns = useExpansionColumns();

  if ('lines' in rowData && rowData.lines.length > 1) {
    return <MiniTable rows={rowData.lines} columns={expandoColumns} />;
  } else {
    return null;
  }
};

const useHighlightPlaceholderRows = (
  rows: StockOutLineFragment[] | StockOutItem[] | undefined
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
      if ('type' in row) {
        if (
          row.type === InvoiceLineNodeType.UnallocatedStock ||
          row.numberOfPacks === 0
        ) {
          placeholders.push(row.id);
        }
      } else {
        const hasPlaceholder = row.lines.some(
          line => line.type === InvoiceLineNodeType.UnallocatedStock
        );
        if (hasPlaceholder) {
          // Add both the OutboundItem and the individual lines, as
          // this will cause the item to be highlighted as well as the
          // lines within the expansion when grouped.
          row.lines.forEach(line => {
            if (line.type === InvoiceLineNodeType.UnallocatedStock) {
              placeholders.push(line.id);
            }
          });
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

export const ContentAreaComponent: FC<ContentAreaProps> = ({
  onAddItem,
  onRowClick,
}) => {
  const t = useTranslation('distribution');
  const {
    updateSortQuery,
    queryParams: { sortBy },
  } = useUrlQueryParams();
  const { isGrouped } = useIsGrouped('outboundShipment');
  const { rows } = useOutbound.line.rows(isGrouped);
  const columns = useOutboundColumns({
    onChangeSortBy: updateSortQuery,
    sortBy,
  });
  const isDisabled = useOutbound.utils.isDisabled();
  useHighlightPlaceholderRows(rows);

  if (!rows) return null;

  return (
    <Box flexDirection="column" display="flex" flex={1}>
      <DataTable
        id="outbound-detail"
        onRowClick={onRowClick}
        ExpandContent={Expand}
        columns={columns}
        data={rows}
        enableColumnSelection
        noDataElement={
          <NothingHere
            body={t('error.no-outbound-items')}
            onCreate={isDisabled ? undefined : () => onAddItem()}
            buttonText={t('button.add-item')}
          />
        }
        isRowAnimated={true}
      />
    </Box>
  );
};

export const ContentArea = React.memo(ContentAreaComponent);
