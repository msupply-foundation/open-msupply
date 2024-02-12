import React from 'react';
import {
  Box,
  StatusCrumbs,
  useTranslation,
  AppFooterPortal,
  StocktakeNodeStatus,
} from '@openmsupply-client/common';
import { stocktakeStatuses, getStocktakeTranslator } from '../../../utils';
import { StocktakeFragment, useStocktake } from '../../api';
import { StatusChangeButton } from './StatusChangeButton';
import { StocktakeLockButton } from './StocktakeLockButton';

const createStatusLog = (stocktake: StocktakeFragment) => {
  return {
    [StocktakeNodeStatus.New]: stocktake.createdDatetime,
    [StocktakeNodeStatus.Finalised]: stocktake.finalisedDatetime,
  };
};

export const Footer = () => {
  const t = useTranslation('inventory');
  const { data: stocktake } = useStocktake.document.get();

  return (
    <AppFooterPortal
      Content={
        stocktake && (
          <Box
            gap={2}
            display="flex"
            flexDirection="row"
            alignItems="center"
            height={64}
          >
            <StocktakeLockButton />
            <StatusCrumbs
              statuses={stocktakeStatuses}
              statusLog={createStatusLog(stocktake)}
              statusFormatter={getStocktakeTranslator(t)}
            />

            <Box flex={1} display="flex" justifyContent="flex-end" gap={2}>
              <StatusChangeButton />
            </Box>
          </Box>
        )
      }
    />
  );
};
