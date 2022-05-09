import React, { FC } from 'react';
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

export const Footer: FC = () => {
  const t = useTranslation(['common', 'inventory']);
  const { data } = useStocktake.document.get();

  return (
    <AppFooterPortal
      Content={
        data && (
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
              statusLog={createStatusLog(data)}
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
