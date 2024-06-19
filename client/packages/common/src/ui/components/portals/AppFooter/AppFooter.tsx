import { Box, BoxProps, Portal } from '@mui/material';
import { styled } from '@mui/material/styles';
import React, { FC, ReactNode, useEffect, useRef } from 'react';
import { useHostContext } from '@common/hooks';
import { useIsCentralServerApi } from '@openmsupply-client/common';

const Container = styled('div')(() => ({
  display: 'flex',
  flex: 1,
  maxHeight: 100,
  justifyContent: 'center',
  flexDirection: 'column',
  paddingLeft: '20px',
  paddingRight: '20px',
}));

export const AppFooter: FC = () => {
  const { setAppFooterRef, setAppSessionDetailsRef } = useHostContext();
  const appFooterRef = useRef(null);
  const appSessionDetailsRef = useRef(null);
  const isCentralServer = useIsCentralServerApi();

  useEffect(() => {
    setAppFooterRef(appFooterRef);
    setAppSessionDetailsRef(appSessionDetailsRef);
  }, []);

  return (
    <Box>
      <Container ref={appFooterRef} style={{ flex: 0 }} />
      <Container
        ref={appSessionDetailsRef}
        sx={{
          backgroundColor: isCentralServer ? 'primary.main' : 'background.menu',
          color: isCentralServer ? '#fff' : 'gray.main',
        }}
      />
    </Box>
  );
};

interface AppFooterPortalProps extends BoxProps {
  SessionDetails?: ReactNode;
  Content?: ReactNode;
}

export const AppFooterPortal: FC<AppFooterPortalProps> = ({
  SessionDetails,
  Content,
  ...boxProps
}) => {
  const { appFooterRef, appSessionDetailsRef } = useHostContext();

  if (!(appFooterRef && appSessionDetailsRef)) return null;

  return (
    <>
      <Portal container={appFooterRef.current}>
        <Box {...boxProps}>{Content}</Box>
      </Portal>
      <Portal container={appSessionDetailsRef.current}>
        <Box {...boxProps}>{SessionDetails}</Box>
      </Portal>
    </>
  );
};
