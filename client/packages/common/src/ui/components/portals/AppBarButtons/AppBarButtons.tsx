import { Box, BoxProps, Portal } from '@mui/material';
import React, { FC, useEffect, useRef } from 'react';
import { useHostContext, useIsExtraSmallScreen } from '@common/hooks';

export const AppBarButtons: FC = () => {
  const { setAppBarButtonsRef } = useHostContext();
  const ref = useRef(null);
  const isExtraSmallScreen = useIsExtraSmallScreen();

  useEffect(() => {
    setAppBarButtonsRef(ref);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Box
      ref={ref}
      sx={{
        display: 'flex',
        flex: isExtraSmallScreen ? undefined : 1,
        justifyContent: isExtraSmallScreen ? undefined : 'flex-end',
      }}
    />
  );
};

export const AppBarButtonsPortal: FC<BoxProps> = props => {
  const { appBarButtonsRef } = useHostContext();

  if (!appBarButtonsRef?.current) return null;

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
