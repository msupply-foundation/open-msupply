import React, { CSSProperties } from 'react';
import { CircularProgress, Typography } from '@mui/material';
import Box from '@mui/material/Box';
import { styled } from '@mui/material/styles';
import { LocaleKey, useTranslation } from '@common/intl';

interface BasicSpinnerProps {
  inline?: boolean;
  messageKey?: LocaleKey;
  style?: CSSProperties;
}

const Container = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexDirection: 'column',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
});

const StyledText = styled(Typography)(({ theme }) => ({
  text: {
    marginTop: theme.spacing(3),
  },
}));

export const BasicSpinner = ({
  messageKey = 'loading',
  inline = false,
  style = {},
}: BasicSpinnerProps) => {
  const t = useTranslation();
  return (
    <Container style={inline ? style : { position: 'fixed', ...style }}>
      <CircularProgress />
      <StyledText>{t(messageKey)}</StyledText>
    </Container>
  );
};
