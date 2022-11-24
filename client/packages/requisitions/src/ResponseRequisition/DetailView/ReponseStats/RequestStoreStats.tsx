import React from 'react';
import { useFormatNumber, useTranslation } from '@common/intl';
import {
  AlertIcon,
  Box,
  CircularProgress,
  Tooltip,
  Typography,
} from '@openmsupply-client/common';
import { useResponse } from '../../api';

export interface RequestStoreStatsProps {
  id: string;
}

const MIN_FLEX_BASIS_TO_SHOW_LABEL = 10;
const MIN_FLEX_BASIS_TO_SHOW_VALUE = 5;
const MIN_MC_WIDTH_TO_SHOW_TEXT = 5;

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
  const formatNumber = useFormatNumber();
  if (value === 0) return null;

  const flexBasis = Math.min(Math.round((100 * value) / total), 100);

  return (
    <>
      <Tooltip title={`${label}: ${formatNumber.round(value)}`} placement="top">
        <Box flexBasis={`${flexBasis}%`} flexGrow={1}>
          <Box sx={{ backgroundColor: colour, height: '20px' }} />
          <Box
            style={{
              textAlign: 'end',
              paddingRight: 10,
              paddingTop: 10,
            }}
          >
            {flexBasis > MIN_FLEX_BASIS_TO_SHOW_LABEL ? (
              <Typography
                fontSize={12}
                style={{ textOverflow: 'ellipsis', height: 20 }}
              >
                {label}
              </Typography>
            ) : null}
            {flexBasis > MIN_FLEX_BASIS_TO_SHOW_VALUE ? (
              <Typography fontSize={12}>{formatNumber.round(value)}</Typography>
            ) : null}
          </Box>
        </Box>
      </Tooltip>
      <Divider />
    </>
  );
};

const MonthlyConsumption = ({
  month,
  flexBasis,
  averageMonthlyConsumption,
  showText,
}: {
  month: number;
  flexBasis: string;
  averageMonthlyConsumption: number;
  showText: boolean;
}) => {
  const t = useTranslation('common');
  const formatNumber = useFormatNumber();
  const text = ` (${month} ${t('label.months', {
    count: month,
  })})`;
  const label = `${formatNumber.round(averageMonthlyConsumption * month)}${
    showText ? text : ''
  }`;

  return <MonthlyBar flexBasis={flexBasis} label={label} />;
};

const MonthlyBar = ({
  label,
  left,
  flexBasis,
}: {
  label: string;
  left?: boolean;
  flexBasis?: string;
}) => {
  const directionStyle = left
    ? { borderLeftWidth: 1, paddingLeft: 8 }
    : { paddingLeft: 3, paddingRight: 8, borderRightWidth: 1 };
  return (
    <Box
      sx={{
        borderWidth: 0,
        borderBottomWidth: 1,
        borderColor: 'gray.dark',
        borderStyle: 'solid',
        height: '20px',
        overflow: 'hidden',
      }}
      style={{ ...directionStyle, textAlign: left ? undefined : 'right' }}
      flexBasis={flexBasis}
    >
      <Tooltip title={label} placement="top">
        <Typography
          variant="body1"
          fontSize={12}
          style={{ color: 'gray.dark' }}
        >
          {label}
        </Typography>
      </Tooltip>
    </Box>
  );
};

const CalculationError = ({
  isAmcZero,
  isSohAndQtyZero,
}: {
  isAmcZero?: boolean;
  isSohAndQtyZero?: boolean;
}) => {
  const t = useTranslation('replenishment');
  const detail = isAmcZero
    ? `: ${t('error.amc-is-zero')}`
    : isSohAndQtyZero
    ? `: ${t('error.soh-and-suggested-quantity-are-zero')}`
    : '';
  const message = `${t('error.unable-to-calculate')}${detail}`;

  return (
    <Box display="flex" padding={1} gap={1}>
      <AlertIcon color="primary" fontSize="small" />
      <Typography variant="body1" fontSize={12} sx={{ color: 'error.main' }}>
        {message}
      </Typography>
    </Box>
  );
};

export const RequestStoreStats: React.FC<RequestStoreStatsProps> = ({ id }) => {
  const t = useTranslation('replenishment');
  const { data, isLoading } = useResponse.line.stats(id);
  const averageMonthlyConsumption =
    data?.requestStoreStats.averageMonthlyConsumption || 0;
  if (averageMonthlyConsumption === 0) return <CalculationError isAmcZero />;

  const maxMonthsOfStock = data?.requestStoreStats.maxMonthsOfStock || 0;
  const suggestedQuantity = data?.requestStoreStats.suggestedQuantity || 0;
  const availableStockOnHand = data?.requestStoreStats.stockOnHand || 0;
  const targetQuantity = maxMonthsOfStock * averageMonthlyConsumption;

  if (suggestedQuantity === 0 && availableStockOnHand === 0)
    return <CalculationError isSohAndQtyZero />;

  const monthlyConsumptionWidth =
    availableStockOnHand > targetQuantity
      ? Math.round((100 * targetQuantity) / availableStockOnHand)
      : 100;

  return isLoading ? (
    <CircularProgress />
  ) : (
    <>
      <Box
        sx={{
          paddingLeft: 4,
          paddingRight: 4,
          paddingTop: 4,
          paddingBottom: 2,
        }}
      >
        <>
          <Typography variant="body1" fontWeight={700} fontSize={12}>
            {t('heading.target-quantity')}
          </Typography>
          <Box
            display="flex"
            alignItems="flex-start"
            width={`${monthlyConsumptionWidth}%`}
            style={{ paddingBottom: 7 }}
          >
            <MonthlyBar
              flexBasis="1px"
              label={
                monthlyConsumptionWidth > MIN_MC_WIDTH_TO_SHOW_TEXT ? '0' : ''
              }
              left={true}
            />

            {Array.from({ length: maxMonthsOfStock }, (_, i) => (
              <MonthlyConsumption
                key={i}
                month={i + 1}
                flexBasis={`${100 / maxMonthsOfStock}%`}
                averageMonthlyConsumption={averageMonthlyConsumption}
                showText={monthlyConsumptionWidth > MIN_MC_WIDTH_TO_SHOW_TEXT}
              />
            ))}
          </Box>

          <Box display="flex" alignItems="flex-start" width="100%">
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
        </>
      </Box>
    </>
  );
};
