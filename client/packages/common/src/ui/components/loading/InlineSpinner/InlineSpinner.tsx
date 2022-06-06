import React, { FC } from 'react';
import { CircularProgress, Typography } from '@mui/material';
import Box from '@mui/material/Box';
import { LocaleKey, useTranslation } from '@common/intl';

interface InlineSpinnerProps {
  color?: 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';
  messageKey?: LocaleKey;
}

export const InlineSpinner: FC<InlineSpinnerProps> = ({
  color = 'primary',
  messageKey,
}) => {
  const t = useTranslation('app');

  return (
    <Box
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
      }}
    >
      <CircularProgress size={20} color={color} />
      <Typography sx={{ margin: theme => theme.spacing(1), fontSize: '12px' }}>
        {!!messageKey && t(messageKey)}
      </Typography>
    </Box>
  );
};
