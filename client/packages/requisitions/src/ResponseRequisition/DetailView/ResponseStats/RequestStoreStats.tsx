import React from 'react';
import {
  AlertIcon,
  Box,
  Tooltip,
  Typography,
  ValueBar,
  useFormatNumber,
  useIntlUtils,
  useTranslation,
  Representation,
  RepresentationValue,
  QuantityUtils,
} from '@openmsupply-client/common';
import { calculatePercentage } from './utils';

export interface RequestStoreStatsProps {
  representation: RepresentationValue;
  defaultPackSize: number;
  unitName?: string | null;
  maxMonthsOfStock: number;
  suggestedQuantity: number;
  availableStockOnHand: number;
  averageMonthlyConsumption: number;
}

const MIN_MC_WIDTH_TO_SHOW_TEXT = 5;

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
  const t = useTranslation();
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
  const t = useTranslation();
  const detail = isAmcZero
    ? `: ${t('error.amc-is-zero')}`
    : isSohAndQtyZero
      ? `: ${t('error.soh-and-suggested-quantity-are-zero')}`
      : '';
  const message = `${t('error.unable-to-calculate')}${detail}`;

  return (
    <Box display="flex" padding={2} gap={1} justifyContent="center">
      <AlertIcon color="primary" fontSize="small" />
      <Typography variant="body1" fontSize={12} sx={{ color: 'error.main' }}>
        {message}
      </Typography>
    </Box>
  );
};

export const RequestStoreStats = ({
  representation,
  defaultPackSize,
  unitName,
  maxMonthsOfStock,
  suggestedQuantity,
  availableStockOnHand,
  averageMonthlyConsumption,
}: RequestStoreStatsProps) => {
  const t = useTranslation();
  const { getPlural } = useIntlUtils();
  const unit = unitName
    ? unitName.charAt(0).toUpperCase() + unitName.slice(1)
    : t('label.unit').charAt(0).toUpperCase() + t('label.unit').slice(1);

  const formattedSuggested = QuantityUtils.useValueInUnitsOrPacks(
    representation,
    defaultPackSize,
    suggestedQuantity
  );
  const formattedSoh = QuantityUtils.useValueInUnitsOrPacks(
    representation,
    defaultPackSize,
    availableStockOnHand
  );
  const formattedAmc = QuantityUtils.useValueInUnitsOrPacks(
    representation,
    defaultPackSize,
    averageMonthlyConsumption
  );

  if (formattedAmc === 0) return <CalculationError isAmcZero />;

  const targetQuantity = maxMonthsOfStock * formattedAmc;

  if (formattedSuggested === 0 && formattedSoh === 0)
    return <CalculationError isSohAndQtyZero />;

  const monthlyConsumptionPercent = calculatePercentage(
    targetQuantity,
    formattedSoh
  );

  const display =
    representation === Representation.PACKS
      ? getPlural(t('label.pack'), 2)
      : getPlural(unit, 2);

  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: 800,
        mx: 'auto',
        p: '16px 16px',
      }}
    >
      <Typography variant="body1" fontWeight={700} fontSize={12}>
        {t('heading.target-quantity')} ({display})
      </Typography>
      <Box
        display="flex"
        alignItems="flex-start"
        width={`${monthlyConsumptionPercent}%`}
        style={{ paddingBottom: 7 }}
      >
        <MonthlyBar
          flexBasis="1px"
          label={
            monthlyConsumptionPercent > MIN_MC_WIDTH_TO_SHOW_TEXT ? '0' : ''
          }
          left={true}
        />

        {Array.from({ length: maxMonthsOfStock }, (_, i) => (
          <MonthlyConsumption
            key={i}
            month={i + 1}
            flexBasis={`${100 / maxMonthsOfStock}%`}
            averageMonthlyConsumption={formattedAmc}
            showText={monthlyConsumptionPercent > MIN_MC_WIDTH_TO_SHOW_TEXT}
          />
        ))}
      </Box>

      <Box display="flex" alignItems="flex-start" width="100%">
        <ValueBar
          value={formattedSoh}
          total={targetQuantity}
          label={t('label.stock-on-hand')}
          colour="gray.main"
          startDivider
        />
        <ValueBar
          value={formattedSuggested}
          total={targetQuantity}
          label={t('label.suggested-order-quantity')}
          colour="primary.light"
        />
      </Box>
    </Box>
  );
};
