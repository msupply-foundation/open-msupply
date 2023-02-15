import React, { useEffect, useState } from 'react';
import {
  Divider,
  Box,
  DataTable,
  NonNegativeNumberInput,
  useTranslation,
  useDebounceCallback,
  InvoiceNodeStatus,
  TableCell,
  styled,
} from '@openmsupply-client/common';
import { ItemRowFragment } from '@openmsupply-client/system';
import { DraftOutboundLine } from '../../../types';
import { PackSizeController, useOutboundLineEditRows } from './hooks';
import { useOutbound } from '../../api';
import { useOutboundLineEditColumns } from './columns';
import { shouldUpdatePlaceholder } from './utils';

export interface OutboundLineEditTableProps {
  onChange: (key: string, value: number, packSize: number) => void;
  packSizeController: PackSizeController;
  rows: DraftOutboundLine[];
  item: ItemRowFragment | null;
  allocatedQuantity: number;
  allocatedPacks: number;
}

const PlaceholderCell = styled(TableCell)(({ theme }) => ({
  fontSize: 12,
  padding: '4px 12px 4px 12px',
  color: theme.palette.secondary.main,
}));

const TotalCell = styled(TableCell)({
  fontSize: 14,
  padding: '4px 12px 4px 12px',
  fontWeight: 'bold',
});

const PlaceholderRow = ({
  line,
  onChange,
}: {
  line?: DraftOutboundLine;
  onChange: (key: string, value: number, packSize: number) => void;
}) => {
  const t = useTranslation('distribution');
  const { status } = useOutbound.document.fields('status');
  const debouncedOnChange = useDebounceCallback(onChange, []);
  const [placeholderBuffer, setPlaceholderBuffer] = useState(
    line?.numberOfPacks ?? 0
  );

  useEffect(() => {
    setPlaceholderBuffer(line?.numberOfPacks ?? 0);
  }, [line?.numberOfPacks]);

  return !line ? null : (
    <tr>
      <PlaceholderCell colSpan={3} sx={{ color: 'secondary.main' }}>
        {t('label.placeholder')}
      </PlaceholderCell>
      <PlaceholderCell style={{ textAlign: 'right' }}>1</PlaceholderCell>
      <PlaceholderCell colSpan={4}></PlaceholderCell>
      <PlaceholderCell style={{ textAlign: 'right' }}>
        {placeholderBuffer}
      </PlaceholderCell>
      <PlaceholderCell>
        <Box>
          <NonNegativeNumberInput
            onChange={value => {
              setPlaceholderBuffer(value);
              debouncedOnChange(line.id, value, 1);
            }}
            value={placeholderBuffer}
            disabled={status !== InvoiceNodeStatus.New}
          />
        </Box>
      </PlaceholderCell>
    </tr>
  );
};

const TotalRow = ({
  allocatedPacks,
  allocatedQuantity,
}: {
  allocatedPacks: number;
  allocatedQuantity: number;
}) => {
  const t = useTranslation('distribution');

  return (
    <tr>
      <TotalCell colSpan={3}>{t('label.total-quantity')}</TotalCell>
      <TotalCell colSpan={5}></TotalCell>
      <TotalCell
        style={{
          textAlign: 'right',
          paddingRight: 12,
        }}
      >
        {allocatedQuantity}
      </TotalCell>
      <TotalCell
        style={{
          textAlign: 'right',
          paddingRight: 36,
        }}
      >
        {allocatedPacks}
      </TotalCell>
    </tr>
  );
};

export const OutboundLineEditTable: React.FC<OutboundLineEditTableProps> = ({
  onChange,
  packSizeController,
  rows,
  item,
  allocatedQuantity,
  allocatedPacks,
}) => {
  const t = useTranslation('distribution');
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
  const unit = item?.unitName ?? t('label.unit');

  const columns = useOutboundLineEditColumns({
    onChange: onEditStockLine,
    unit,
  });

  const additionalRows = [
    <PlaceholderRow
      line={placeholderRow}
      onChange={onChange}
      key="placeholder-row"
    />,
    <tr key="divider-row">
      <td colSpan={10}>
        <Divider margin={10} />
      </td>
    </tr>,
    <TotalRow
      key="total-row"
      allocatedQuantity={allocatedQuantity}
      allocatedPacks={allocatedPacks}
    />,
  ];

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
            id="outbound-line-edit"
            columns={columns}
            data={orderedRows}
            dense
            additionalRows={additionalRows}
          />
        )}
      </Box>
    </Box>
  );
};
