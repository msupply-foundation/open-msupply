import React from 'react';
import {
  AppBarButtonsPortal,
  Box,
  Typography,
  frontEndHostUrl,
  useNativeClient,
  useTranslation,
} from '@openmsupply-client/common';
import QRCode from 'react-qr-code';

const ServerInfoComponent = () => {
  console.info('app bar??');
  const { connectedServer } = useNativeClient();
  const t = useTranslation();
  const serverUrl = !!connectedServer
    ? frontEndHostUrl(connectedServer)
    : window.location.origin;

  return (
    <AppBarButtonsPortal>
      <Box display="flex" flexDirection="column" padding={1}>
        <Box display="flex" justifyContent="flex-end">
          <QRCode value={serverUrl} size={50}></QRCode>
        </Box>
        <Box display="flex">
          <Typography color={'gray.dark'} fontWeight={'bold'} paddingRight={1}>
            {t('label.server')}:
          </Typography>
          <Typography color={'gray.main'}>{serverUrl}</Typography>
        </Box>
      </Box>
    </AppBarButtonsPortal>
  );
};

export const ServerInfo = React.memo(ServerInfoComponent);
