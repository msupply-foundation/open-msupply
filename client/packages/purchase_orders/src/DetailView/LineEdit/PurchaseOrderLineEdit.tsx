import React from 'react';
import {
  Divider,
  Box,
  useTranslation,
  TableCell,
  styled,
  useFormatNumber,
  Tooltip,
  NumUtils,
} from '@openmsupply-client/common';
import { CurrencyRowFragment } from '@openmsupply-client/system';
import { min } from 'lodash';

export interface OutboundLineEditTableProps {}

const PlaceholderCell = styled(TableCell)(({ theme }) => ({
  fontSize: 12,
  padding: '4px 20px 4px 12px',
  color: theme.palette.secondary.main,
}));

const TotalCell = styled(TableCell)(({ theme }) => ({
  fontSize: 14,
  padding: '8px 12px 4px 12px',
  fontWeight: 'bold',
  position: 'sticky',
  bottom: 0,
  background: theme.palette.background.white,
  borderTop: `1px solid ${theme.palette.divider}`,
}));

const PlaceholderRow = ({
  quantity,
  extraColumnOffset,
  dosesPerUnit,
}: {
  quantity: number | null;
  extraColumnOffset: number;
  dosesPerUnit?: number;
}) => {
  const t = useTranslation();

  const formattedValue = useFormatNumber().round(quantity ?? 0, 2);

  // TODO - maybe should be editable? Can't clear when manually allocating..
  return quantity === null ? null : (
    <tr>
      <PlaceholderCell
        colSpan={5 + extraColumnOffset}
        sx={{ color: 'secondary.main' }}
      >
        {t('label.placeholder')}
      </PlaceholderCell>
      <PlaceholderCell style={{ textAlign: 'right', paddingRight: '14px' }}>
        1
      </PlaceholderCell>
      {!!dosesPerUnit && (
        <PlaceholderCell style={{ textAlign: 'right', paddingRight: '14px' }}>
          {dosesPerUnit}
        </PlaceholderCell>
      )}
      <PlaceholderCell colSpan={dosesPerUnit ? 2 : 3}></PlaceholderCell>
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

const TotalRow = ({
  allocatedQuantity,
  extraColumnOffset,
}: {
  allocatedQuantity: number;
  extraColumnOffset: number;
}) => {
  const t = useTranslation();
  const formattedValue = useFormatNumber().round(allocatedQuantity, 2);

  return (
    <tr>
      <TotalCell colSpan={3}>{t('label.total-quantity')}</TotalCell>
      <TotalCell colSpan={6 + extraColumnOffset}></TotalCell>
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
      <TotalCell colSpan={2} />
    </tr>
  );
};

export const PurchaseOrderLineEdit = ({}: OutboundLineEditTableProps) => {
  return (
    <Box style={{ width: '100%' }}>
      <Divider margin={10} />
      <Box
        style={{
          maxHeight: min([screen.height - 570, 325]),
          display: 'flex',
          flexDirection: 'column',
          overflowX: 'hidden',
          overflowY: 'auto',
        }}
      >
        hello
      </Box>
    </Box>
  );
};
