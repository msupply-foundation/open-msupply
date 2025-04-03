import React, { useEffect, useState } from 'react';
import {
  Divider,
  Box,
  DataTable,
  useTranslation,
  TableCell,
  styled,
  useFormatNumber,
  Tooltip,
  NumUtils,
} from '@openmsupply-client/common';
import { DraftStockOutLine } from '../../../types';
import { useOutboundLineEditRows } from './hooks';
import { useOutboundLineEditColumns } from './columns';
import { DraftItem } from '../../..';
import { PackSizeController, shouldUpdatePlaceholder } from '../../../StockOut';
import { CurrencyRowFragment } from '@openmsupply-client/system';

export interface OutboundLineEditTableProps {
  onChange: (key: string, value: number, packSize: number) => void;
  packSizeController: PackSizeController;
  rows: DraftStockOutLine[];
  item: DraftItem | null;
  allocatedQuantity: number;
  batch?: string;
  currency?: CurrencyRowFragment | null;
  isExternalSupplier: boolean;
}

const PlaceholderCell = styled(TableCell)(({ theme }) => ({
  fontSize: 12,
  padding: '4px 20px 4px 12px',
  color: theme.palette.secondary.main,
}));

const TotalCell = styled(TableCell)({
  fontSize: 14,
  padding: '4px 12px 4px 12px',
  fontWeight: 'bold',
});

const PlaceholderRow = ({ line }: { line?: DraftStockOutLine }) => {
  const t = useTranslation();
  const [placeholderBuffer, setPlaceholderBuffer] = useState(
    line?.numberOfPacks ?? 0
  );

  useEffect(() => {
    setPlaceholderBuffer(line?.numberOfPacks ?? 0);
  }, [line?.numberOfPacks]);
  const formattedValue = useFormatNumber().round(placeholderBuffer, 2);

  return !line ? null : (
    <tr>
      <PlaceholderCell colSpan={3} sx={{ color: 'secondary.main' }}>
        {t('label.placeholder')}
      </PlaceholderCell>
      <PlaceholderCell style={{ textAlign: 'right' }}>1</PlaceholderCell>
      <PlaceholderCell colSpan={4}></PlaceholderCell>
      <Tooltip title={line?.numberOfPacks.toString()}>
        <PlaceholderCell style={{ textAlign: 'right' }}>
          {!!NumUtils.hasMoreThanTwoDp(placeholderBuffer)
            ? `${formattedValue}...`
            : formattedValue}
        </PlaceholderCell>
      </Tooltip>
    </tr>
  );
};

const TotalRow = ({ allocatedQuantity }: { allocatedQuantity: number }) => {
  const t = useTranslation();
  const formattedValue = useFormatNumber().round(allocatedQuantity, 2);

  return (
    <tr>
      <TotalCell colSpan={3}>{t('label.total-quantity')}</TotalCell>
      <TotalCell colSpan={5}></TotalCell>
      <Tooltip title={allocatedQuantity.toString()}>
        <TotalCell
          style={{
            textAlign: 'right',
            paddingRight: 12,
          }}
        >
          {!!NumUtils.hasMoreThanTwoDp(allocatedQuantity)
            ? `${formattedValue}...`
            : formattedValue}
        </TotalCell>
      </Tooltip>
    </tr>
  );
};

export const OutboundLineEditTable: React.FC<OutboundLineEditTableProps> = ({
  onChange,
  packSizeController,
  rows,
  item,
  allocatedQuantity,
  batch,
  currency,
  isExternalSupplier,
}) => {
  const t = useTranslation();
  const { orderedRows, placeholderRow } = useOutboundLineEditRows(
    rows,
    packSizeController,
    batch
  );
  const onEditStockLine = (key: string, value: number, packSize: number) => {
    const num = Number.isNaN(value) ? 0 : value;
    onChange(key, num, packSize);
    if (placeholderRow && shouldUpdatePlaceholder(num, placeholderRow)) {
      // if a stock line has been allocated
      // and the placeholder row is a generated one,
      // remove the placeholder row
      placeholderRow.isUpdated = true;
      placeholderRow.numberOfPacks = 0;
    }
  };
  const unit = item?.unitName ?? t('label.unit');

  const columns = useOutboundLineEditColumns({
    onChange: onEditStockLine,
    unit,
    currency,
    isExternalSupplier,
  });

  const additionalRows = [
    <PlaceholderRow line={placeholderRow} key="placeholder-row" />,
    <tr key="divider-row">
      <td colSpan={10}>
        <Divider margin={10} />
      </td>
    </tr>,
    <TotalRow key="total-row" allocatedQuantity={allocatedQuantity} />,
  ];

  return (
    <Box style={{ width: '100%' }}>
      <Divider margin={10} />
      <Box
        style={{
          maxHeight: 325,
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
