import { Box, BoxProps, Portal } from '@mui/material';
import { styled } from '@mui/material/styles';
import React, { ReactNode, useEffect, useRef } from 'react';
import { useHostContext, useKeyboard } from '@common/hooks';

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
  isCentralServer,
  backgroundColor,
  textColor,
}: AppFooterProps) => {
  const setAppFooterRef = useHostContext(s => s.setAppFooterRef);
  const setAppSessionDetailsRef = useHostContext(s => s.setAppSessionDetailsRef);
  const fullScreen = useHostContext(s => s.fullScreen);
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
  const appFooterRef = useHostContext(s => s.appFooterRef);
  const appSessionDetailsRef = useHostContext(s => s.appSessionDetailsRef);
  const incrementFooterActions = useHostContext(s => s.incrementFooterActions);
  const decrementFooterActions = useHostContext(s => s.decrementFooterActions);

  // Only `Content` claims the upper footer slot (`appFooterRef`). A portal
  // that only contributes `SessionDetails` — which mounts to a separate slot
  // (`appSessionDetailsRef`, the coloured session bar) — doesn't compete
  // with a status portal and so must not suppress it. The Site's app-wide
  // footer is the canonical example.
  const hasContent = Content != null && Content !== false;
  useEffect(() => {
    if (!hasContent) return;
    incrementFooterActions();
    return decrementFooterActions;
  }, [hasContent, incrementFooterActions, decrementFooterActions]);

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

interface AppFooterStatusPortalProps extends BoxProps {
  Content?: ReactNode;
}

/**
 * Mounts `Content` into the same footer slot as {@link AppFooterPortal}, but
 * steps aside whenever any `AppFooterPortal` with `Content` is mounted. Use
 * this to register a default/fallback footer (e.g. status crumbs visible
 * across every tab in a detail view) that a more specific child can override
 * without needing to coordinate with the parent.
 */
export const AppFooterStatusPortal = ({
  Content,
  ...boxProps
}: AppFooterStatusPortalProps) => {
  const appFooterRef = useHostContext(s => s.appFooterRef);
  const footerActionsCount = useHostContext(s => s.footerActionsCount);

  if (footerActionsCount > 0) return null;
  if (!appFooterRef?.current) return null;

  return (
    <Portal container={appFooterRef.current}>
      <Box {...boxProps}>{Content}</Box>
    </Portal>
  );
};
