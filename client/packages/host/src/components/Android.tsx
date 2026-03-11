import React, { useEffect, useState } from 'react';
import { AppRoute } from '@openmsupply-client/config';
import {
  BasicSpinner,
  Box,
  ButtonWithIcon,
  ConnectionResult,
  ErrorWithDetails,
  HomeIcon,
  getNativeAPI,
  getPreference,
  NativeMode,
  RadioIcon,
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
import { LanguageButton } from './LanguageButton';

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
  icon,
  label,
  mode,
  message,
  setMode,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  mode: NativeMode;
  message: string;
  setMode: (mode: NativeMode) => void;
  color?: 'primary' | 'secondary';
}) => (
  <Box display="flex" gap={3} alignItems="center" padding=".5em 1em">
    <Box flex={0}>
      <ButtonWithIcon
        onClick={() => setMode(mode)}
        Icon={icon}
        label={label}
        shouldShrink={false}
        color={color}
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
  const t = useTranslation();
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
          <Box
            display="flex"
            flex="0 0 40%"
            alignSelf="center"
            sx={theme => ({
              [theme.breakpoints.down('sm')]: {
                flexDirection: 'column',
                flex: '0 0 35%',
              },
            })}
          >
            <Box
              display="flex"
              alignItems="center"
              justifyContent="center"
              padding={2}
            >
              <LoginIcon />
            </Box>
            <Box
              display="flex"
              flexDirection="column"
              justifyContent="center"
              sx={theme => ({
                [theme.breakpoints.down('sm')]: {
                  alignItems: 'center',
                  paddingX: '1.5em',
                },
              })}
            >
              <Heading text={t('initialise.heading')} />
              <SubHeading text={t('messages.native-mode')} />
            </Box>
          </Box>
          <Stack spacing={3} maxWidth={400}>
            <ModeOption
              icon={<RadioIcon fontSize="small" />}
              label={t('label.connect')}
              mode={NativeMode.Client}
              message={t('messages.native-mode-client')}
              setMode={handleSetMode}
              color="secondary"
            />
            <ModeOption
              icon={<HomeIcon fontSize="small" />}
              label={t('label.local')}
              mode={NativeMode.Server}
              message={t('messages.native-mode-server')}
              setMode={handleSetMode}
              color="primary"
            />
          </Stack>
        </Stack>
        <LanguageButton />
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
