import React, { FC } from 'react';
import { CircularProgress, Typography } from '@material-ui/core';
import Box from '@material-ui/core/Box';
import { styled } from '@material-ui/core/styles';

const Container = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexDirection: 'column',
  position: 'fixed',
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

export const LoadingSpinner: FC = () => {
  return (
    <Container>
      <CircularProgress />
      <StyledText>Loading...</StyledText>
    </Container>
  );
};
