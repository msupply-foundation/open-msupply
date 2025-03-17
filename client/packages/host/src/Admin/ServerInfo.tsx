import React, { FC, PropsWithChildren } from 'react';
import {
  Box,
  Tooltip,
  Typography,
  frontEndHostUrl,
  useIsCentralServerApi,
  useNativeClient,
  usePopover,
  useTranslation,
} from '@openmsupply-client/common';
import QRCode from 'react-qr-code';
import { ClickAwayListener } from '@mui/base';

// Version is shared for client and server and is located in repo root package.json
const appVersion = require('../../../../../package.json').version; // eslint-disable-line @typescript-eslint/no-var-requires

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
  const { show, hide, Popover } = usePopover();
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
          onClick={show}
          alignContent="center"
          flexWrap="wrap"
          sx={{ cursor: 'pointer' }}
        >
          <QRCode value={serverUrl} size={50} />
        </Box>
      </Tooltip>
      <Popover onClick={hide}>
        <ClickAwayListener onClickAway={hide}>
          <Box
            padding={2}
            sx={{
              backgroundColor: 'background.white',
              borderRadius: 1,
              boxShadow: theme => theme.shadows[3],
            }}
          >
            <QRCode value={serverUrl} size={256} />
          </Box>
        </ClickAwayListener>
      </Popover>
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
