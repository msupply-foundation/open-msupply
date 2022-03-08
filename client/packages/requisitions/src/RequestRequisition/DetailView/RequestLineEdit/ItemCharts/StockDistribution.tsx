import React from 'react';
import {
  Box,
  Tooltip,
  Typography,
  useTranslation,
} from '@openmsupply-client/common';
import { ItemRowWithStatsFragment } from '@openmsupply-client/system';

export interface StockDistributionProps {
  item: ItemRowWithStatsFragment | null;
  suggestedQuantity?: number;
}

const MIN_FLEX_BASIS_TO_SHOW_LABEL = 10;
const MIN_FLEX_BASIS_TO_SHOW_VALUE = 5;
const MIN_PERCENTAGE_TO_SHOW_ZERO = 0.15;

const Divider = () => (
  <Box sx={{ backgroundColor: 'gray.dark', width: '1px', height: '45px' }} />
);

const ValueBar = ({
  value,
  total,
  label,
  colour,
}: {
  value: number;
  total: number;
  label: string;
  colour: string;
}) => {
  if (value === 0) return null;

  const flexBasis = Math.round((100 * value) / total);

  return (
    <>
      <Tooltip title={`${label}: ${value}`} placement="top">
        <Box flexBasis={`${flexBasis}%`} flexGrow={1}>
          <Box sx={{ backgroundColor: colour, height: '20px' }} />
          <Box style={{ textAlign: 'end', paddingRight: 10, paddingTop: 10 }}>
            {flexBasis > MIN_FLEX_BASIS_TO_SHOW_LABEL ? (
              <Typography
                fontSize={12}
                style={{ textOverflow: 'ellipsis', height: 20 }}
              >
                {label}
              </Typography>
            ) : null}
            {flexBasis > MIN_FLEX_BASIS_TO_SHOW_VALUE ? (
              <Typography fontSize={12}>{value}</Typography>
            ) : null}
          </Box>
        </Box>
      </Tooltip>
      <Divider />
    </>
  );
};

export const StockDistribution: React.FC<StockDistributionProps> = ({
  item,
  suggestedQuantity = 0,
}) => {
  if (!item) return null;

  const { availableStockOnHand } = item.stats;
  const targetQuantity = suggestedQuantity + availableStockOnHand;
  const t = useTranslation('replenishment');

  if (targetQuantity === 0) return null;

  const sohPercentage = availableStockOnHand / targetQuantity;
  const showZero = sohPercentage > MIN_PERCENTAGE_TO_SHOW_ZERO;

  return (
    <Box padding={4}>
      <Typography variant="body1" fontWeight={700} style={{ marginBottom: 10 }}>
        {t('heading.stock-distribution')}
      </Typography>

      <Box display="flex" alignItems="flex-start">
        <Divider />
        <ValueBar
          value={availableStockOnHand}
          total={targetQuantity}
          label={t('label.stock-on-hand')}
          colour="gray.main"
        />
        <ValueBar
          value={suggestedQuantity}
          total={targetQuantity}
          label={t('label.suggested-order-quantity')}
          colour="primary.light"
        />
      </Box>
      {showZero && (
        <Box style={{ position: 'relative', left: 10, top: -41 }}>
          <Typography fontSize={12}>0</Typography>
        </Box>
      )}
    </Box>
  );
};
