import React from 'react';
import {
  Box,
  NothingHere,
  Table,
  useTranslation,
} from '@openmsupply-client/common';
import { RnRFormLineFragment } from '../../api/operations.generated';
import { RnRFormLine } from './RnRFormLine';

interface ContentAreaProps {
  data: RnRFormLineFragment[];
  saveLine: (line: RnRFormLineFragment) => Promise<void>;
  periodLength: number;
  disabled: boolean;
}

export const ContentArea = ({
  data,
  saveLine,
  periodLength,
  disabled,
}: ContentAreaProps) => {
  const t = useTranslation('replenishment');

  // TODO: move to backend, should join on item and sort by name!
  const lines = data.sort((a, b) => (a.item.name > b.item.name ? 1 : -1));

  return lines.length === 0 ? (
    <NothingHere body={t('error.no-items')} />
  ) : (
    <Box flex={1} padding={2}>
      <Table
        sx={{
          '& th': {
            textAlign: 'left',
            padding: 1,
            fontWeight: 'bold',
            border: '1px solid lightgray',
          },
          '& td': {
            padding: '2px',
            border: '1px solid lightgray',
          },
        }}
      >
        <thead>
          <tr>
            <th style={{ width: '80px' }}>{t('label.code')}</th>
            <th style={{ minWidth: '300px' }}>{t('label.name')}</th>
            <th>{t('label.strength')}</th>
            <th>{t('label.unit')}</th>
            <th>{t('label.ven')}</th>
            <th>{t('label.rnr-initial-balance')}</th>
            <th>{t('label.rnr-received')}</th>
            <th>{t('label.rnr-consumed')}</th>
            <th>{t('label.rnr-consumed-adjusted')}</th>
            <th>{t('label.rnr-adjustments')}</th>
            <th>{t('label.rnr-stock-out-duration')}</th>
            <th>{t('label.rnr-final-balance')}</th>
            <th>{t('label.amc')}</th>
            <th>{t('label.rnr-maximum-quantity')}</th>
            <th>{t('label.expiry')}</th>
            <th>{t('label.requested-quantity')}</th>
            <th>{t('label.comment')}</th>
            <th>{t('label.confirmed')}</th>
          </tr>
        </thead>

        <tbody>
          {lines.map(line => (
            <RnRFormLine
              key={line.id}
              line={line}
              periodLength={periodLength}
              saveLine={saveLine}
              disabled={disabled}
            />
          ))}
        </tbody>
      </Table>
    </Box>
  );
};
