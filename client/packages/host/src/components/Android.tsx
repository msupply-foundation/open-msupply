import React, { useEffect } from 'react';

import { AppRoute } from '@openmsupply-client/config';
import {
  BasicSpinner,
  Box,
  ButtonWithIcon,
  ErrorWithDetails,
  ExternalLinkIcon,
  getNativeAPI,
  NativeMode,
  RouteBuilder,
  Stack,
  Theme,
  Typography,
  useNativeClient,
  useNavigate,
} from '@openmsupply-client/common';
import { useTranslation } from '@common/intl';
import Viewport from './Viewport';
import { LoginIcon } from './Login/LoginIcon';

const Heading = ({ text }: { text: string }) => (
  <Typography
    component="div"
    sx={{
      color: (theme: Theme) => theme.palette.gray.main,
      fontSize: {
        xs: '38px',
        sm: '38px',
        md: '48px',
        lg: '64px',
        xl: '64px',
      },
      fontWeight: 'bold',
      display: 'flex',
      justifyContent: 'center',
      flexDirection: 'column',
    }}
  >
    {text}
  </Typography>
);

const SubHeading = ({ text }: { text: string }) => (
  <Typography
    component="div"
    display="flex"
    flex={0}
    justifyContent="center"
    sx={{
      fontSize: {
        xs: '12px',
        sm: '14px',
        md: '16px',
        lg: '20px',
        xl: '20px',
      },
      color: 'gray.main',
      fontWeight: 600,
      whiteSpace: 'pre-line',
      paddingBottom: '10%',
      maxWidth: '400px',
    }}
  >
    {text}
  </Typography>
);

export const Android = () => {
  const {
    mode,
    setMode,
    connectToPreviousTimedOut,
    previousServer,
    servers,
    connectToServer,
    advertiseService,
  } = useNativeClient({
    discovery: true,
    autoconnect: true,
  });
  const t = useTranslation('app');
  const navigate = useNavigate();
  const ModeOption = ({
    label,
    mode,
    message,
  }: {
    label: string;
    mode: NativeMode;
    message: string;
  }) => (
    <Box display="flex" gap={2} alignItems="center">
      <Box flex={0}>
        <ButtonWithIcon
          onClick={() => setMode(mode)}
          Icon={<ExternalLinkIcon fontStyle="small" />}
          label={label}
          shouldShrink={false}
        />
      </Box>

      <Typography component="div" sx={{ color: 'gray.main' }} flex={1}>
        {message}
      </Typography>
    </Box>
  );

  useEffect(() => {
    // this page is not for web users! begone!
    if (!getNativeAPI()) navigate(RouteBuilder.create(AppRoute.Login).build());
  }, []);

  useEffect(() => {
    if (mode === NativeMode.Server) {
      advertiseService();
    }
  }, [mode]);

  useEffect(() => {
    if (mode === NativeMode.Server) {
      const localServer = servers.find(server => server.isLocal);
      if (localServer) {
        connectToServer(localServer);
      }
    }
  }, [mode, servers]);

  useEffect(() => {
    if (
      mode === NativeMode.Client &&
      (!previousServer || connectToPreviousTimedOut)
    ) {
      navigate(
        RouteBuilder.create(AppRoute.Discovery)
          .addPart(`?timedout=${!!connectToPreviousTimedOut}`)
          .build()
      );
    }
  }, [mode, previousServer, connectToPreviousTimedOut]);

  if (mode === null)
    return (
      <Viewport>
        <Stack
          display="flex"
          flex={1}
          style={{ minHeight: '100%' }}
          alignItems="center"
          justifyContent="center"
        >
          <Box display="flex" flex="0 0 40%" alignSelf="center">
            <Box
              display="flex"
              alignItems="center"
              justifyContent="center"
              padding={2}
            >
              <LoginIcon />
            </Box>
            <Box display="flex" flexDirection="column" justifyContent="center">
              <Heading text={t('initialise.heading')} />
              <SubHeading text={t('messages.native-mode')} />
            </Box>
          </Box>
          <Stack spacing={5} maxWidth={400}>
            <ModeOption
              label={t('label.client')}
              mode={NativeMode.Client}
              message={t('messages.native-mode-client')}
            />
            <ModeOption
              label={t('label.server')}
              mode={NativeMode.Server}
              message={t('messages.native-mode-server')}
            />
          </Stack>
        </Stack>
      </Viewport>
    );

  if (mode === NativeMode.Server && connectToPreviousTimedOut)
    return (
      <Viewport>
        <Box
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            width: '100vw',
            height: '100vh',
          }}
        >
          <ErrorWithDetails
            error={t('error.server-failed-to-start')}
            details=""
          />
        </Box>
      </Viewport>
    );

  return (
    <Viewport>
      <BasicSpinner />
    </Viewport>
  );
};
