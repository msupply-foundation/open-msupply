import { Box, BoxProps, styled } from '@mui/system';
import { Portal } from '@mui/material';
import React, { FC, useEffect, useRef } from 'react';
import { useHostContext } from '../../../../hooks';

const Container = styled('div')({
  display: 'flex',
  flex: 1,
  justifyContent: 'flex-end',
});

export const AppBarButtons: FC = () => {
  const { setAppBarButtonsRef } = useHostContext();
  const ref = useRef(null);

  useEffect(() => {
    setAppBarButtonsRef(ref);
  }, []);

  return <Container ref={ref} />;
};

export const AppBarButtonsPortal: FC<BoxProps> = props => {
  const { appBarButtonsRef } = useHostContext();

  if (!appBarButtonsRef) return null;

  return (
    <Portal container={appBarButtonsRef.current}>
      <Box {...props} />
    </Portal>
  );
};
