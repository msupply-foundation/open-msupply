import React from 'react';
import {
  Box,
  NothingHere,
  Table,
  useTheme,
  useTranslation,
  VenCategoryType,
} from '@openmsupply-client/common';
import { RnRFormLineFragment } from '../../api/operations.generated';

interface ContentAreaProps {
  data: RnRFormLineFragment[];
}

export const ContentArea = ({ data }: ContentAreaProps) => {
  const t = useTranslation('replenishment');

  return data.length === 0 ? (
    <NothingHere body={t('error.no-items')} />
  ) : (
    <Box flex={1} padding={2}>
      <Table
        sx={{
          '& th': {
            textAlign: 'left',
            color: 'text',
            padding: 1,
            fontWeight: 'bold',
            border: '1px solid lightgray',
          },
          '& td': {
            padding: 1,
            border: '1px solid lightgray',
          },
        }}
      >
        <thead>
          <th>{t('label.code')}</th>
          <th>{t('label.name')}</th>
          <th>{t('label.strength')}</th>
          <th>{t('label.unit')}</th>
          <th>{t('label.ven')}</th>
          <th>{t('label.rnr-initial-balance')}</th>
          <th>{t('label.rnr-received')}</th>
          <th>{t('label.rnr-consumed')}</th>
          <th>{t('label.rnr-losses')}</th>
          <th>{t('label.rnr-stock-out-duration')}</th>
          <th>{t('label.rnr-consumed-adjusted')}</th>
          <th>{t('label.rnr-final-balance')}</th>
          <th>{t('label.amc')}</th>
          <th>{t('label.rnr-maximum-quantity')}</th>
          <th>{t('label.expiry')}</th>
          <th>{t('label.requested-quantity')}</th>
          <th>{t('label.comment')}</th>
        </thead>

        {data.map((line, index) => (
          <RnRFormLine key={index} line={line} />
        ))}
      </Table>
    </Box>
  );
};

export const RnRFormLine = ({ line }: { line: RnRFormLineFragment }) => {
  // const t = useTranslation('replenishment');
  const theme = useTheme();

  const venCategory =
    line.item.venCategory === VenCategoryType.NotAssigned
      ? ''
      : line.item.venCategory;

  const disabledSx = {
    backgroundColor: theme.palette.background.drawer,
    color: theme.palette.text.disabled,
  };

  return (
    <tr>
      <td style={disabledSx}>{line.item.code}</td>
      <td style={disabledSx}>{line.item.name}</td>
      <td style={disabledSx}>{line.item.strength}</td>
      <td style={disabledSx}>{line.item.unitName}</td>
      <td style={disabledSx}>{venCategory}</td>
      <td>{line.initialBalance}</td>
      <td>{line.quantityReceived}</td>
      <td>{line.quantityConsumed}</td>
      <td>{line.adjustments}</td>
      <td>{line.stockOutDuration}</td>
      <td style={disabledSx}>{line.adjustedQuantityConsumed}</td>
      <td>{line.finalBalance}</td>
      <td style={disabledSx}>{line.averageMonthlyConsumption}</td>
      <td>{line.maximumQuantity}</td>
      <td>{line.expiryDate}</td>
      <td>{line.requestedQuantity}</td>
      <td>{line.comment}</td>
    </tr>
  );
};
