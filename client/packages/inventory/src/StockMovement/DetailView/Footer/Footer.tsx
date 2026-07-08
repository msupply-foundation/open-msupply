import React from 'react';
import {
  Box,
  StatusCrumbs,
  useTranslation,
  AppFooterPortal,
  StockRelocationNodeStatus,
} from '@openmsupply-client/common';
import {
  stockMovementStatuses,
  getStatusTranslation,
  isStockMovementDisabled,
} from '../../utils';
import { StockMovementFragment } from '../../api';
import { StatusChangeButton } from './StatusChangeButton';

const createStatusLog = (movement: StockMovementFragment) => ({
  [StockRelocationNodeStatus.New]: movement.createdDatetime,
  [StockRelocationNodeStatus.Confirmed]: movement.confirmedDatetime ?? null,
  [StockRelocationNodeStatus.Finalised]: movement.finalisedDatetime ?? null,
});

interface FooterProps {
  movement: StockMovementFragment;
}

export const Footer = ({ movement }: FooterProps) => {
  const t = useTranslation();

  return (
    <AppFooterPortal
      Content={
        <Box
          gap={2}
          display="flex"
          flexDirection="row"
          alignItems="center"
          height={64}
        >
          <StatusCrumbs
            statuses={stockMovementStatuses}
            statusLog={createStatusLog(movement)}
            statusFormatter={status => getStatusTranslation(status, t)}
          />
          <Box flex={1} display="flex" justifyContent="flex-end" gap={2}>
            {!isStockMovementDisabled(movement.status) && (
              <StatusChangeButton movement={movement} />
            )}
          </Box>
        </Box>
      }
    />
  );
};
