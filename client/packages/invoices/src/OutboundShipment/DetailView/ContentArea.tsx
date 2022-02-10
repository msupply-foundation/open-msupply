import React, { FC } from 'react';
import {
  DataTable,
  useTranslation,
  Box,
  Switch,
  useColumns,
  MiniTable,
  useIsGrouped,
} from '@openmsupply-client/common';
import { InvoiceLine, InvoiceItem } from '../../types';
import { useOutboundRows } from '../api';
import { useOutboundColumns } from './columns';

interface GeneralTabProps<T> {
  onRowClick?: (rowData: T) => void;
}

const Expand: FC<{
  rowData: InvoiceLine | InvoiceItem;
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

  if ('lines' in rowData) {
    return <MiniTable rows={rowData.lines} columns={columns} />;
  } else {
    return null;
  }
};

export const ContentAreaComponent: FC<
  GeneralTabProps<InvoiceLine | InvoiceItem>
> = ({ onRowClick }) => {
  const t = useTranslation('distribution');
  const { isGrouped, toggleIsGrouped } = useIsGrouped('outboundShipment');
  const { rows, onChangeSortBy, sortBy } = useOutboundRows(isGrouped);
  const columns = useOutboundColumns({ onChangeSortBy, sortBy });

  if (!rows) return null;

  return (
    <Box flexDirection="column">
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
        noDataMessage={t('error.no-items')}
      />
    </Box>
  );
};

export const ContentArea = React.memo(ContentAreaComponent);
