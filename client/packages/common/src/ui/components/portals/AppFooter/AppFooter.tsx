import { Box, BoxProps, Portal } from '@mui/material';
import { styled } from '@mui/material/styles';
import React, { ReactNode, useEffect, useRef } from 'react';
import { useHostContext, useKeyboard } from '@common/hooks';
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

interface AppFooterProps {
  isCentralServer?: boolean;
  backgroundColor?: string;
  textColor?: string;
}

export const AppFooter = ({
  backgroundColor,
  textColor,
  isCentralServer,
}: AppFooterProps) => {
  const { setAppFooterRef, setAppSessionDetailsRef, fullScreen } =
    useHostContext();
  const { keyboardIsOpen } = useKeyboard();
  const appFooterRef = useRef(null);
  const appSessionDetailsRef = useRef(null);

  useEffect(() => {
    setAppFooterRef(appFooterRef);
    setAppSessionDetailsRef(appSessionDetailsRef);
  }, []);

  const hideFooter = fullScreen || keyboardIsOpen;

  return (
    <Box sx={{ display: hideFooter ? 'none' : undefined }}>
      <Container ref={appFooterRef} style={{ flex: 0 }} />
      <Container
        ref={appSessionDetailsRef}
        sx={{
          backgroundColor:
            backgroundColor ??
            (isCentralServer ? 'primary.main' : 'background.menu'),
          color: textColor ?? (isCentralServer ? '#fff' : 'gray.main'),
        }}
      />
    </Box>
  );
};

interface AppFooterPortalProps extends BoxProps {
  SessionDetails?: ReactNode;
  Content?: ReactNode;
}

export const AppFooterPortal = ({
  SessionDetails,
  Content,
  ...boxProps
}: AppFooterPortalProps) => {
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
