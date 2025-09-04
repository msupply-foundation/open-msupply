import React from 'react';
import {
  useTranslation,
  Box,
  Typography,
  SimpleStatistic,
  UNDEFINED_STRING_VALUE,
} from '@openmsupply-client/common';
import { StockLineRowFragment } from '../../api';

export const ItemDetailAndStats = ({
  stockLine,
  variation,
}: {
  stockLine: StockLineRowFragment;
  variation: number;
}) => {
  const t = useTranslation();

  const {
    item: { code, name },
    packSize,
    totalNumberOfPacks,
    availableNumberOfPacks,
  } = stockLine;
  return (
    <Box
      sx={{
        borderWidth: 4,
        borderRadius: '16px',
        borderStyle: 'solid',
        borderColor: 'border',
        padding: 1,
        margin: '0 auto',
        width: '520px',
      }}
    >
      <Box sx={{ paddingX: 1, marginBottom: 1 }}>
        <Typography>
          {t('label.code')}:
          <Typography component="span" color="gray.dark">
            {` ${code} | `}
          </Typography>
          {t('label.pack-size')}:
          <Typography component="span" color="gray.dark">
            {` ${packSize}`}
          </Typography>
        </Typography>

        <Typography sx={{ fontWeight: 500, fontSize: '22px' }}>
          {name}
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
        <AdjustmentStats
          originalValue={availableNumberOfPacks}
          variation={variation}
          label={t('label.available-packs')}
        />
        <AdjustmentStats
          originalValue={totalNumberOfPacks}
          variation={variation}
          label={t('label.packs-on-hand')}
        />
      </Box>
    </Box>
  );
};

export const AdjustmentStats = ({
  originalValue,
  variation,
  label,
}: {
  originalValue: number;
  variation: number;
  label: string;
}) => {
  const t = useTranslation();

  return (
    <Box
      sx={{
        backgroundColor: 'background.secondary',
        padding: '1em',
        borderRadius: '16px',
        flex: 1,
      }}
    >
      <Typography
        sx={{ fontWeight: '600', fontSize: '0.875em', textAlign: 'center' }}
      >
        {label}
      </Typography>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'end',
          gap: '1em',
          marginY: '0.25em',
        }}
      >
        <SimpleStatistic
          label={t('label.current')}
          value={originalValue}
          color={'secondary.main'}
        />
        <Box
          sx={{
            width: '2px',
            height: '4em',
            backgroundColor: 'secondary.main',
          }}
        ></Box>
        <SimpleStatistic
          label={t('label.adjusted')}
          value={
            variation === 0 ? UNDEFINED_STRING_VALUE : originalValue + variation
          }
          color={'secondary.main'}
        />
      </Box>
    </Box>
  );
};
