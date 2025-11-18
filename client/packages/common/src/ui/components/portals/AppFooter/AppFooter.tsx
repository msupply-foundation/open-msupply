import { Box, BoxProps, Portal } from '@mui/material';
import { styled, useTheme } from '@mui/material/styles';
import React, { FC, ReactNode, useEffect, useRef } from 'react';
import { useHostContext, useKeyboard } from '@common/hooks';
import {
  useIsCentralServerApi,
  usePreferences,
} from '@openmsupply-client/common';

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
  const { setAppFooterRef, setAppSessionDetailsRef, fullScreen } =
    useHostContext();
  const { keyboardIsOpen } = useKeyboard();
  const appFooterRef = useRef(null);
  const appSessionDetailsRef = useRef(null);
  const isCentralServer = useIsCentralServerApi();
  const { storeCustomColour } = usePreferences();
  const theme = useTheme();

  useEffect(() => {
    setAppFooterRef(appFooterRef);
    setAppSessionDetailsRef(appSessionDetailsRef);
  }, []);

  const hideFooter = fullScreen || keyboardIsOpen;

  // Colours for the Footer bar, if specified in Store prefs
  let customColour: string | undefined;
  let textColour: string | undefined;
  if (storeCustomColour) {
    // Try/catch essentially validates the colour string -- if it's invalid, the
    // `getContrastText` function with throw, so neither customColour nor
    // textColour will be defined
    try {
      textColour = theme.palette.getContrastText(storeCustomColour ?? '');
      customColour = storeCustomColour;
    } catch (e) {
      console.error('Error parsing footer colours from Store properties', e);
    }
  }

  return (
    <Box sx={{ display: hideFooter ? 'none' : undefined }}>
      <Container ref={appFooterRef} style={{ flex: 0 }} />
      <Container
        ref={appSessionDetailsRef}
        sx={{
          backgroundColor:
            customColour ??
            (isCentralServer ? 'primary.main' : 'background.menu'),
          color: textColour ?? (isCentralServer ? '#fff' : 'gray.main'),
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
