import { Box, BoxProps, Portal } from '@mui/material';
import { styled, useTheme } from '@mui/material/styles';
import React, { FC, ReactNode, useEffect, useRef } from 'react';
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
  nameProperties?: { colour?: string };
}

export const AppFooter: FC<AppFooterProps> = ({ nameProperties }) => {
  const { setAppFooterRef, setAppSessionDetailsRef, fullScreen } =
    useHostContext();
  const { keyboardIsOpen } = useKeyboard();
  const appFooterRef = useRef(null);
  const appSessionDetailsRef = useRef(null);
  const isCentralServer = useIsCentralServerApi();
  const theme = useTheme();

  useEffect(() => {
    setAppFooterRef(appFooterRef);
    setAppSessionDetailsRef(appSessionDetailsRef);
  }, []);

  const hideFooter = fullScreen || keyboardIsOpen;

  // Colours for the Footer bar, if specified in Store properties
  const customColour = nameProperties?.colour;
  const textColour = theme.palette.getContrastText(customColour || '');

  return (
    <Box sx={{ display: hideFooter ? 'none' : undefined }}>
      <Container ref={appFooterRef} style={{ flex: 0 }} />
      <Container
        ref={appSessionDetailsRef}
        sx={{
          backgroundColor:
            customColour ??
            (isCentralServer ? 'primary.main' : 'background.menu'),
          color: customColour
            ? textColour
            : isCentralServer
              ? '#fff'
              : 'gray.main',
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
