import React from 'react';
import {
  useTranslation,
  Box,
  Typography,
  SimpleStatistic,
} from '@openmsupply-client/common';
import { StockLineRowFragment } from '../../api';

export const ItemDetailAndStats = ({
  stockLine,
}: {
  stockLine: StockLineRowFragment;
}) => {
  const t = useTranslation();

  const {
    item: { code, name, unitName },
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
        paddingX: 2,
        paddingY: 1,
        marginBottom: 2,
      }}
    >
      {/* Or maybe simpler, just: */}
      {/* <Typography>{code}</Typography> */}

      <Typography color="gray.dark">
        {t('label.code')}: {code}
        {unitName && (
          <Typography component="span" color="gray.dark">
            {' '}
            | {t('label.unit')}: {unitName}
          </Typography>
        )}
      </Typography>
      <Typography sx={{ fontWeight: 500, fontSize: '22px' }}>{name}</Typography>

      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-evenly',
          gap: 4,
          marginTop: 2,
          alignItems: 'end', // ensure numbers align even if 1 label wraps
        }}
      >
        <SimpleStatistic label={t('label.pack-size')} value={packSize} />
        <SimpleStatistic
          label={t('label.available-packs')}
          value={availableNumberOfPacks}
        />
        <SimpleStatistic
          label={t('label.total-packs-on-hand')}
          value={totalNumberOfPacks}
        />
      </Box>
    </Box>
  );
};

export const AdjustmentStats = ({
  stockLine,
  variation,
}: {
  stockLine: StockLineRowFragment;
  variation: number;
}) => {
  const t = useTranslation();
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'end',
        backgroundColor: 'background.secondary',
        padding: '1em',
        borderRadius: '16px',
        gap: '1em',
      }}
    >
      <SimpleStatistic
        label={t('label.new-available-packs')}
        value={stockLine.availableNumberOfPacks + variation}
        color={'secondary.main'}
      />
      <Box
        sx={{
          width: '1px',
          backgroundColor: 'secondary.main',
          height: '-webkit-fill-available',
        }}
      ></Box>
      <SimpleStatistic
        label={t('label.new-total-packs')}
        value={stockLine.totalNumberOfPacks + variation}
        color={'secondary.main'}
      />
    </Box>
  );
};
