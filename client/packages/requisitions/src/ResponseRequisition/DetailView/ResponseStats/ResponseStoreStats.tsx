import React from 'react';
import { useFormatNumber, useIntlUtils, useTranslation } from '@common/intl';
import {
  Box,
  Typography,
  NewValueBar,
  RequisitionNodeStatus,
  RepresentationValue,
  QuantityUtils,
} from '@openmsupply-client/common';
import { calculatePercentage, stats } from './utils';

export interface ResponseStoreStatsProps {
  requisitionStatus: RequisitionNodeStatus;
  representation: RepresentationValue;
  defaultPackSize: number;
  unitName?: string | null;
  stockOnHand: number;
  incomingStock: number;
  stockOnOrder: number;
  requestedQuantity: number;
  otherRequestedQuantity: number;
}

export const ResponseStoreStats = ({
  requisitionStatus,
  representation,
  defaultPackSize,
  unitName,
  stockOnHand,
  incomingStock,
  stockOnOrder,
  requestedQuantity,
  otherRequestedQuantity,
}: ResponseStoreStatsProps) => {
  const t = useTranslation();
  const { getPlural } = useIntlUtils();
  const { round } = useFormatNumber();
  const unit = unitName || t('label.unit');

  const statsDisplay = stats(t, getPlural, round, unit, representation);

  const formattedSoh = QuantityUtils.useValueInUnitsOrPacks(
    representation,
    defaultPackSize,
    stockOnHand
  );
  const formattedIncoming = QuantityUtils.useValueInUnitsOrPacks(
    representation,
    defaultPackSize,
    incomingStock
  );
  const formattedSoo = QuantityUtils.useValueInUnitsOrPacks(
    representation,
    defaultPackSize,
    stockOnOrder
  );
  const formattedRequested = QuantityUtils.useValueInUnitsOrPacks(
    representation,
    defaultPackSize,
    requestedQuantity
  );
  const formattedOtherRequested = QuantityUtils.useValueInUnitsOrPacks(
    representation,
    defaultPackSize,
    otherRequestedQuantity
  );

  const predictedStockLevels = formattedSoh + formattedIncoming + formattedSoo;
  const totalRequested = formattedRequested + formattedOtherRequested;

  const predictedStockPercent = calculatePercentage(
    predictedStockLevels,
    totalRequested
  );
  const requestedPercent = calculatePercentage(
    totalRequested,
    predictedStockLevels
  );

  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: 800,
        mx: 'auto',
        p: '16px 16px',
      }}
    >
      <Box
        flex={1}
        sx={{
          p: '4px 8px',
        }}
      >
        {formattedSoh === 0 && formattedIncoming === 0 && formattedSoo === 0 ? (
          <Typography
            fontSize={14}
            style={{ textAlign: 'center' }}
            justifyContent="center"
          >
            ⓘ
            <span style={{ fontStyle: 'italic', paddingLeft: 4 }}>
              {t('messages.requisition-no-stock')}
            </span>
          </Typography>
        ) : (
          <>
            <Box>
              <Typography variant="h6" style={{ textAlign: 'start' }}>
                {t('label.our-stock')}
              </Typography>
            </Box>
            <Box
              display="flex"
              alignItems="flex-start"
              flexDirection="column"
              width={`${predictedStockPercent}%`}
            >
              <Box display="flex" width="100%">
                <NewValueBar
                  value={formattedSoh}
                  total={predictedStockLevels}
                  colour="gray.dark"
                />
                <NewValueBar
                  value={formattedIncoming}
                  total={predictedStockLevels}
                  colour="gray.main"
                />
                <NewValueBar
                  value={formattedSoo}
                  total={predictedStockLevels}
                  colour="gray.light"
                />
              </Box>
              <Box paddingTop={1}>
                {formattedSoh !== null &&
                  statsDisplay(
                    'label.stock-on-hand',
                    formattedSoh,
                    'gray.dark'
                  )}
                {formattedIncoming !== null &&
                  statsDisplay(
                    'label.incoming-stock',
                    formattedIncoming,
                    'gray.main'
                  )}
                {formattedSoo !== null &&
                  statsDisplay(
                    'label.stock-on-order',
                    formattedSoo,
                    'gray.light'
                  )}
              </Box>
            </Box>
          </>
        )}
      </Box>
      <Box
        sx={{
          p: '4px 8px',
        }}
      >
        {formattedRequested === 0 && formattedOtherRequested === 0 ? (
          <Typography
            fontSize={14}
            style={{ textAlign: 'center' }}
            justifyContent="center"
          >
            ⓘ
            <span style={{ fontStyle: 'italic', paddingLeft: 4 }}>
              {t('messages.no-requested-quantities')}
            </span>
          </Typography>
        ) : (
          <>
            <Typography style={{ textAlign: 'start' }} variant="h6">
              {t('label.requested')}
            </Typography>
            <Box
              display="flex"
              alignItems="flex-start"
              flexDirection="column"
              width={`${requestedPercent}%`}
            >
              <Box display="flex" width="100%">
                <NewValueBar
                  value={formattedRequested}
                  total={totalRequested}
                  colour="primary.main"
                />
                <NewValueBar
                  value={formattedOtherRequested}
                  total={totalRequested}
                  colour="primary.light"
                />
              </Box>
              <Box paddingTop={1}>
                {statsDisplay(
                  'label.requested-quantity',
                  formattedRequested,
                  'primary.main'
                )}
                {requisitionStatus !== RequisitionNodeStatus.Finalised &&
                  statsDisplay(
                    'label.other-requested-quantity',
                    formattedOtherRequested,
                    'primary.light'
                  )}
              </Box>
            </Box>
          </>
        )}
      </Box>
    </Box>
  );
};
