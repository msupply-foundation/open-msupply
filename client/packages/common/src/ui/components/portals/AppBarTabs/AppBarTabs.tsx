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
  const { setAppBarTabsRef } = useHostContext();
  const ref = useRef(null);

  useEffect(() => {
    setAppBarTabsRef(ref);
  }, []);

  return <Container ref={ref} />;
};

export const AppBarTabsPortal: FC<BoxProps> = props => {
  const { appBarTabsRef } = useHostContext();

  if (!appBarTabsRef) return null;

  return (
    <Portal container={appBarTabsRef.current}>
      <Box {...props} />
    </Portal>
  );
};
