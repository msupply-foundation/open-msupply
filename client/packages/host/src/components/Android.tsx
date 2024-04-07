import React, { useEffect, useState } from 'react';

import { AppRoute } from '@openmsupply-client/config';
import {
  BasicSpinner,
  Box,
  ButtonWithIcon,
  ConnectionResult,
  ErrorWithDetails,
  ExternalLinkIcon,
  getNativeAPI,
  getPreference,
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

const ModeOption = ({
  label,
  mode,
  message,
  setMode,
}: {
  label: string;
  mode: NativeMode;
  message: string;
  setMode: (mode: NativeMode) => void;
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

export const Android = () => {
  const { connectToPreviousFailed, previousServer } = useNativeClient({
    discovery: true,
    autoconnect: true,
  });
  const t = useTranslation('app');
  const navigate = useNavigate();
  const [mode, setLocalMode] = useState(NativeMode.None);
  const { setMode, setServerMode } = useNativeClient();

  const handleSetMode = (mode: NativeMode) => {
    setMode(mode);
    setLocalMode(mode);
  };

  const handleConnectionResult = async (result: ConnectionResult) => {
    if (result.success) return;

    console.error('Connecting to previous server:', result.error);
    navigate(
      RouteBuilder.create(AppRoute.Discovery)
        .addPart(`?timedout=${!!connectToPreviousFailed}`)
        .build()
    );
  };

  useEffect(() => {
    // this page is not for web users! begone!
    if (!getNativeAPI()) navigate(RouteBuilder.create(AppRoute.Login).build());
    getPreference('mode', '"none"').then(setLocalMode);
  }, [navigate]);

  useEffect(() => {
    if (mode === NativeMode.Server) {
      setServerMode(handleConnectionResult);
    }
  }, [mode]);

  useEffect(() => {
    if (
      mode === NativeMode.Client &&
      (!previousServer?.ip || connectToPreviousFailed)
    ) {
      navigate(
        RouteBuilder.create(AppRoute.Discovery)
          .addPart(`?timedout=${!!connectToPreviousFailed}`)
          .build()
      );
    }
  }, [mode, previousServer, connectToPreviousFailed, navigate]);

  if (mode === NativeMode.None)
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
              setMode={handleSetMode}
            />
            <ModeOption
              label={t('label.server')}
              mode={NativeMode.Server}
              message={t('messages.native-mode-server')}
              setMode={handleSetMode}
            />
          </Stack>
        </Stack>
      </Viewport>
    );

  if (mode === NativeMode.Server && connectToPreviousFailed)
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
