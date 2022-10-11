import React, { useState } from 'react';
import {
  Divider,
  Box,
  DataTable,
  NonNegativeNumberInput,
  useTranslation,
  Typography,
  useDebounceCallback,
  InvoiceNodeStatus,
} from '@openmsupply-client/common';
import { DraftOutboundLine } from '../../../types';
import { PackSizeController, useOutboundLineEditRows } from './hooks';
import { useOutbound } from '../../api';
import { useOutboundLineEditColumns } from './columns';
import { shouldUpdatePlaceholder } from './utils';

export interface OutboundLineEditTableProps {
  onChange: (key: string, value: number, packSize: number) => void;
  packSizeController: PackSizeController;
  rows: DraftOutboundLine[];
}

const PlaceholderRow = ({
  line,
  onChange,
}: {
  line: DraftOutboundLine;
  onChange: (key: string, value: number, packSize: number) => void;
}) => {
  const t = useTranslation('distribution');
  const { status } = useOutbound.document.fields('status');
  const debouncedOnChange = useDebounceCallback(onChange, []);
  const [placeholderBuffer, setPlaceholderBuffer] = useState(
    line?.numberOfPacks ?? 0
  );

  return (
    <Box display="flex">
      <Typography
        style={{
          alignItems: 'center',
          display: 'flex',
          flex: '0 1 100px',
          fontSize: 12,
          justifyContent: 'flex-end',
          paddingRight: 8,
        }}
      >
        {t('label.placeholder')}
      </Typography>
      <Box sx={{ paddingTop: '3px' }}>
        <NonNegativeNumberInput
          onChange={value => {
            setPlaceholderBuffer(value);
            debouncedOnChange(line.id, value, 1);
          }}
          value={placeholderBuffer}
          disabled={status !== InvoiceNodeStatus.New}
        />
      </Box>
    </Box>
  );
};

export const OutboundLineEditTable: React.FC<OutboundLineEditTableProps> = ({
  onChange,
  packSizeController,
  rows,
}) => {
  const { orderedRows, placeholderRow } = useOutboundLineEditRows(
    rows,
    packSizeController
  );
  const onEditStockLine = (key: string, value: number, packSize: number) => {
    onChange(key, value, packSize);
    if (placeholderRow && shouldUpdatePlaceholder(value, placeholderRow))
      // if a stock line has been allocated
      // and the placeholder row is a generated one with a zero value,
      // this allows removal of the placeholder row
      placeholderRow.isUpdated = true;
  };

  const columns = useOutboundLineEditColumns({ onChange: onEditStockLine });

  return (
    <Box style={{ width: '100%' }}>
      <Divider margin={10} />
      <Box
        style={{
          display: 'flex',
          flexDirection: 'column',
          overflowX: 'hidden',
          overflowY: 'auto',
        }}
      >
        {!!orderedRows.length && (
          <DataTable
            key="outbound-line-edit"
            columns={columns}
            data={orderedRows}
            dense
          />
        )}
        {placeholderRow ? (
          <PlaceholderRow line={placeholderRow} onChange={onChange} />
        ) : null}
      </Box>
    </Box>
  );
};
