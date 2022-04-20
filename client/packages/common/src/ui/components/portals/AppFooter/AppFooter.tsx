import { Box, BoxProps, Portal } from '@mui/material';
import { styled } from '@mui/material/styles';
import React, { FC, ReactNode, useEffect, useRef } from 'react';
import { useHostContext } from '@common/hooks';

const Container = styled('div')(({ theme }) => ({
  backgroundColor: theme.palette.background.menu,
  display: 'flex',
  flex: 1,
  maxHeight: 100,
  justifyContent: 'flex-end',
  flexDirection: 'column',
  paddingLeft: '20px',
  paddingRight: '20px',
}));

export const AppFooter: FC = () => {
  const { setAppFooterRef, setAppSessionDetailsRef } = useHostContext();
  const appFooterRef = useRef(null);
  const appSessionDetailsRef = useRef(null);

  useEffect(() => {
    setAppFooterRef(appFooterRef);
    setAppSessionDetailsRef(appSessionDetailsRef);
  }, []);

  return (
    <Box>
      <Container ref={appFooterRef} />
      <Container ref={appSessionDetailsRef} />
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
        <Box {...boxProps} style={{ paddingBottom: 3, paddingTop: 5 }}>
          {SessionDetails}
        </Box>
      </Portal>
    </>
  );
};
