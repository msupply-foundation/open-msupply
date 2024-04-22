import { Box, BoxProps, Portal, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';
import React, { FC, ReactNode, useEffect, useRef } from 'react';
import { useHostContext } from '@common/hooks';
import { CentralIcon, useIsCentralServerApi } from '@openmsupply-client/common';
import { useTranslation } from '@common/intl';

const Container = styled('div')(() => ({
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
  const isCentralServer = useIsCentralServerApi();
  const t = useTranslation('app');

  useEffect(() => {
    setAppFooterRef(appFooterRef);
    setAppSessionDetailsRef(appSessionDetailsRef);
  }, []);

  return (
    <Box
      sx={{
        backgroundColor: isCentralServer ? 'primary.main' : 'background.menu',
        color: isCentralServer ? '#fff' : 'gray.main',
      }}
    >
      <Container ref={appFooterRef} style={{ flex: 0 }} />
      <Container ref={appSessionDetailsRef} />
      {isCentralServer ? (
        <Box
          flex={0}
          display="flex"
          alignItems="center"
          paddingX={2}
          paddingY={0.5}
        >
          <CentralIcon />
          <Typography
            variant="caption"
            sx={{ color: 'inherit', whiteSpace: 'nowrap' }}
          >
            {t('label.central-server')}
          </Typography>
        </Box>
      ) : null}
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
