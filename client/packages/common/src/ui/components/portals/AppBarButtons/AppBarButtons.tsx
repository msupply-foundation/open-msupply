import { Box, BoxProps, Portal } from '@mui/material';
import { styled } from '@mui/material/styles';
import React, { FC, useEffect, useRef } from 'react';
import { useHostContext, useIsExtraSmallScreen } from '@common/hooks';

const Container = styled('div')({
  display: 'flex',
  flex: 1,
  justifyContent: 'flex-end',
});

const MobileContainer = styled('div')({
  display: 'flex',
  justifyContent: 'flex-end',
});

export const AppBarButtons: FC = () => {
  const { setAppBarButtonsRef } = useHostContext();
  const ref = useRef(null);

  const isExtraSmallScreen = useIsExtraSmallScreen();

  useEffect(() => {
    setAppBarButtonsRef(ref);
  }, []);
  if (isExtraSmallScreen) {
    return <MobileContainer ref={ref} />;
  }

  return <Container ref={ref} />;
};

export const AppBarButtonsPortal: FC<BoxProps> = props => {
  const { appBarButtonsRef } = useHostContext();

  if (!appBarButtonsRef) return null;

  return (
    <Portal container={appBarButtonsRef.current}>
      <Box
        sx={{
          padding: 1.5,
        }}
        {...props}
      />
    </Portal>
  );
};
