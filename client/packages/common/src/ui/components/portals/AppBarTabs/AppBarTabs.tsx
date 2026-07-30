import { Box, BoxProps, Portal } from '@mui/material';
import { styled } from '@mui/material/styles';
import React, { FC, useEffect, useRef } from 'react';
import { useHostContext } from '@common/hooks';

const Container = styled('div')({
  display: 'flex',
  flex: 1,
  justifyContent: 'center',
});

export const AppBarTabs: FC = () => {
  const setAppBarTabsRef = useHostContext(s => s.setAppBarTabsRef);
  const ref = useRef(null);

  useEffect(() => {
    setAppBarTabsRef(ref);
  }, []);

  return <Container ref={ref} />;
};

export const AppBarTabsPortal: FC<BoxProps> = props => {
  const appBarTabsRef = useHostContext(s => s.appBarTabsRef);

  if (!appBarTabsRef?.current) return null;

  return (
    <Portal container={appBarTabsRef.current}>
      <Box {...props} />
    </Portal>
  );
};
