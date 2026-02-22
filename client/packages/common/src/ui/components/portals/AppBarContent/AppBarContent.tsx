import { Box, BoxProps, Portal } from '@mui/material';
import { styled } from '@mui/material/styles';
import React, { FC, useEffect, useRef } from 'react';
import { useHostContext, useIsExtraSmallScreen } from '@common/hooks';

// TODO: Create a function which creates the two below components?
// createPortalPair(refName) => { Container, Portal }
// we seem to be using this pattern a bit

const Container = styled('div')({
  display: 'flex',
  flex: 1,
  justifyContent: 'flex-end',
});

const MobileContainer = styled('div')({});

// TODO: Some sort of registry/state to ensure that there is only one of these
// mounted at any one time as mounting this in multiple locations would cause
// some pretty weird behaviour
export const AppBarContent: FC = () => {
  const { setAppBarContentRef } = useHostContext();
  const ref = useRef(null);
  const isExtraSmallScreen = useIsExtraSmallScreen();

  useEffect(() => {
    setAppBarContentRef(ref);
  }, []);

  if (isExtraSmallScreen) {
    return <MobileContainer ref={ref} />;
  }

  return <Container ref={ref} />;
};

export const AppBarContentPortal: FC<BoxProps> = props => {
  const { appBarContentRef } = useHostContext();

  if (!appBarContentRef) return null;

  return (
    <Portal container={appBarContentRef.current}>
      <Box {...props} />
    </Portal>
  );
};
