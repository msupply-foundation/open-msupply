import React from 'react';
import {
  Box,
  NothingHere,
  Table,
  useTranslation,
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
      <Table>
        <thead>
          <th>{t('label.code')}</th>
          <th>{t('label.name')}</th>
          <th>{t('label.unit')}</th>
          <th>{t('label.rnr-initial-balance')}</th>
          <th>{t('label.rnr-received')}</th>
          <th>{t('label.rnr-consumed')}</th>
          <th>{t('label.rnr-consumed-adjusted')}</th>
          {/* <th>{t('label.rnr-losses')}</th> */}
          <th>{t('label.rnr-stock-out-duration')}</th>
          <th>{t('label.rnr-final-balance')}</th>
          <th>{t('label.amc')}</th>
          <th>{t('label.rnr-maximum-quantity')}</th>
          <th>{t('label.expiry')}</th>
          <th>{t('label.requested-quantity')}</th>
          <th>{t('label.comment')}</th>
        </thead>

        {data.map((line, index) => (
          <tr key={index}>
            <td>{line.item.code}</td>
            <td>{line.item.name}</td>
            <td>{line.item.unitName}</td>
            <td>{line.initialBalance}</td>
            <td>{line.quantityReceived}</td>
            <td>{line.quantityConsumed}</td>
            <td>{line.adjustedQuantityConsumed}</td>
            {/* <td>{line.losses}</td> */}
            <td>{line.stockOutDuration}</td>
            <td>{line.finalBalance}</td>
            <td>{line.averageMonthlyConsumption}</td>
            <td>{line.requestedQuantity}</td>
            <td>{line.comment}</td>
          </tr>
        ))}
      </Table>
    </Box>
  );
};
