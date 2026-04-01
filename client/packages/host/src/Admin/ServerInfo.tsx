import React, { FC, PropsWithChildren } from 'react';
import {
  Box,
  PaperPopover,
  Tooltip,
  Typography,
  frontEndHostUrl,
  useIsCentralServerApi,
  useNativeClient,
  useTranslation,
} from '@openmsupply-client/common';
import QRCode from 'react-qr-code';

// Version is shared for client and server and is located in repo root package.json
import pkg from '../../../../../package.json';
const appVersion = pkg.version;

const Label: FC<PropsWithChildren> = ({ children }) => (
  <Typography
    color={'gray.dark'}
    fontWeight={'bold'}
    component="div"
    sx={{ display: 'flex' }}
  >
    {children}
  </Typography>
);

const Value: FC<PropsWithChildren> = ({ children }) => (
  <Typography color={'gray.main'} component="div" sx={{ display: 'flex' }}>
    {children}
  </Typography>
);

const ServerInfoComponent = ({ siteName }: { siteName?: string | null }) => {
  const { connectedServer } = useNativeClient();
  const t = useTranslation();
  const serverUrl = !!connectedServer
    ? frontEndHostUrl(connectedServer)
    : window.location.origin;
  const isCentralServer = useIsCentralServerApi();

  return (
    <Box display="flex" gap={2}>
      <Tooltip title={t('messages.click-to-expand')}>
        <Box
          display="flex"
          justifyContent="flex-end"
          alignContent="center"
          flexWrap="wrap"
        >
          <PaperPopover
            mode="click"
            placement={{
              vertical: 'bottom',
              horizontal: 'center',
            }}
            Content={<QRCode value={serverUrl} size={256} />}
          >
            <QRCode value={serverUrl} size={50} />
          </PaperPopover>
        </Box>
      </Tooltip>
      <Box display="flex" flexDirection="column">
        <Box display="flex" gap={1}>
          <Box display="flex" flexDirection="column">
            <Label>{t('label.server')}:</Label>
            {siteName && <Label>{t('label.site')}</Label>}
            <Label>{t('label.app-version')}</Label>
          </Box>
          <Box display="flex" flexDirection="column">
            <Value>{serverUrl}</Value>
            {siteName && <Value>{siteName}</Value>}
            <Value>{appVersion}</Value>
          </Box>
        </Box>
        {isCentralServer && <Label>{t('label.central-server')}</Label>}
      </Box>
    </Box>
  );
};

export const ServerInfo = React.memo(ServerInfoComponent);
