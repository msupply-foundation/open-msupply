import React from 'react';
import {
  AppBarButtonsPortal,
  Box,
  Tooltip,
  Typography,
  frontEndHostUrl,
  useNativeClient,
  usePopover,
  useTranslation,
} from '@openmsupply-client/common';
import QRCode from 'react-qr-code';
import { ClickAwayListener } from '@mui/base';

const ServerInfoComponent = () => {
  const { connectedServer } = useNativeClient();
  const t = useTranslation();
  const { show, hide, Popover } = usePopover();
  const serverUrl = !!connectedServer
    ? frontEndHostUrl(connectedServer)
    : window.location.origin;

  return (
    <AppBarButtonsPortal>
      <Box display="flex" flexDirection="column" padding={1}>
        <Tooltip title={t('messages.click-to-expand')}>
          <Box
            display="flex"
            justifyContent="flex-end"
            onClick={show}
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
