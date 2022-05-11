import React, { FC, useEffect } from 'react';
import {
  DataTable,
  useTranslation,
  Box,
  Switch,
  useColumns,
  MiniTable,
  useIsGrouped,
  InvoiceLineNodeType,
  useRowStyle,
  AppSxProp,
  ArrayUtils,
  NothingHere,
} from '@openmsupply-client/common';
import { OutboundItem } from '../../types';
import { useOutbound } from '../api';
import { useOutboundColumns } from './columns';
import { OutboundLineFragment } from '../api/operations.generated';

interface ContentAreaProps {
  onAddItem: () => void;
  onRowClick?: null | ((rowData: OutboundLineFragment | OutboundItem) => void);
}

const Expand: FC<{
  rowData: OutboundLineFragment | OutboundItem;
}> = ({ rowData }) => {
  const columns = useColumns([
    'batch',
    'expiryDate',
    'locationName',
    'itemUnit',
    'numberOfPacks',
    'packSize',
    [
      'unitQuantity',
      {
        accessor: () => {
          if ('lines' in rowData) {
            const { lines } = rowData;
            return ArrayUtils.getUnitQuantity(lines);
          } else {
            return rowData.packSize * rowData.numberOfPacks;
          }
        },
      },
    ],
    'sellPricePerUnit',
  ]);

  if ('lines' in rowData && rowData.lines.length > 1) {
    return <MiniTable rows={rowData.lines} columns={columns} />;
  } else {
    return null;
  }
};

export const useHighlightPlaceholderRows = (
  rows: OutboundLineFragment[] | OutboundItem[] | undefined
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
        if (row.type === InvoiceLineNodeType.UnallocatedStock) {
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
  const { isGrouped, toggleIsGrouped } = useIsGrouped('outboundShipment');
  const { rows, onChangeSortBy, sortBy } = useOutbound.line.rows(isGrouped);
  const columns = useOutboundColumns({ onChangeSortBy, sortBy });
  const isDisabled = useOutbound.utils.isDisabled();
  useHighlightPlaceholderRows(rows);

  if (!rows) return null;

  return (
    <Box flexDirection="column" style={{ width: '100%' }}>
      {rows.length !== 0 && (
        <Box style={{ padding: 5, marginInlineStart: 15 }}>
          <Switch
            label={t('label.group-by-item')}
            onChange={toggleIsGrouped}
            checked={isGrouped}
            size="small"
            disabled={rows.length === 0}
            color="secondary"
          />
        </Box>
      )}
      <DataTable
        onRowClick={onRowClick}
        ExpandContent={Expand}
        columns={columns}
        data={rows}
        noDataElement={
          <NothingHere
            body={t('error.no-outbound-items')}
            onCreate={isDisabled ? undefined : onAddItem}
            buttonText={t('button.add-item')}
          />
        }
      />
    </Box>
  );
};

export const ContentArea = React.memo(ContentAreaComponent);
