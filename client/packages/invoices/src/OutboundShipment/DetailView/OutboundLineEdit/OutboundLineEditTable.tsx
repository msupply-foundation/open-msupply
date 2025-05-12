import React from 'react';
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
  Typography,
} from '@openmsupply-client/common';
import { useOutboundLineEditColumns } from './columns';
import { DraftItem } from '../../..';
import { CurrencyRowFragment } from '@openmsupply-client/system';
import { useAllocationContext } from './allocation/useAllocationContext';

export interface OutboundLineEditTableProps {
  onChange: (key: string, value: number, packSize: number) => void;
  item: DraftItem | null;
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

const PlaceholderRow = ({ quantity }: { quantity: number | null }) => {
  const t = useTranslation();

  const formattedValue = useFormatNumber().round(quantity ?? 0, 2);

  // todo - only display when 0 if its the only line?
  return quantity === null ? null : (
    <tr>
      <PlaceholderCell colSpan={3} sx={{ color: 'secondary.main' }}>
        {t('label.placeholder')}
      </PlaceholderCell>
      <PlaceholderCell
        style={{ textAlign: 'right', paddingRight: '14px' }}
        colSpan={2}
      >
        1
      </PlaceholderCell>
      <PlaceholderCell colSpan={3}></PlaceholderCell>
      <Tooltip title={quantity.toString()}>
        <PlaceholderCell style={{ textAlign: 'right' }}>
          {!!NumUtils.hasMoreThanTwoDp(quantity)
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
            paddingRight: 20,
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

export const OutboundLineEditTable = ({
  onChange,
  item,
  currency,
  isExternalSupplier,
}: OutboundLineEditTableProps) => {
  const t = useTranslation();

  const { allocatedQuantity, draftLines, placeholderQuantity } =
    useAllocationContext(
      ({ allocatedUnits, draftLines, placeholderQuantity }) => ({
        allocatedQuantity: allocatedUnits,
        draftLines,
        placeholderQuantity,
      })
    );

  // const { orderedRows, placeholderRow } = useOutboundLineEditRows(rows, batch);
  const onEditStockLine = (key: string, value: number, packSize: number) => {
    const num = Number.isNaN(value) ? 0 : value;
    onChange(key, num, packSize);
    // if (placeholderLine && shouldUpdatePlaceholder(num, placeholderRow)) {
    //   // if a stock line has been allocated
    //   // and the placeholder row is a generated one,
    //   // remove the placeholder row
    //   // placeholderRow.isUpdated = true;
    //   placeholderRow.numberOfPacks = 0;
    // }
  };
  const unit = item?.unitName ?? t('label.unit');

  const columns = useOutboundLineEditColumns({
    onChange: onEditStockLine,
    unit,
    currency,
    isExternalSupplier,
  });

  const additionalRows = [
    <PlaceholderRow quantity={placeholderQuantity} key="placeholder-row" />,
    <tr key="divider-row">
      <td colSpan={10}>
        <Divider margin={10} />
      </td>
    </tr>,
    <TotalRow key="total-row" allocatedQuantity={allocatedQuantity} />,
  ];

  if (!draftLines.length && placeholderQuantity === null)
    return (
      <Box sx={{ margin: 'auto' }}>
        <Typography>{t('messages.no-stock-available')}</Typography>
      </Box>
    );

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
        <DataTable
          id="outbound-line-edit"
          columns={columns}
          data={draftLines}
          dense
          additionalRows={additionalRows}
        />
      </Box>
    </Box>
  );
};
