import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowRightIcon,
  Box,
  LoadingButton,
  Stack,
  Typography,
  useTranslation,
} from '@openmsupply-client/common';
import { LoginIcon } from './LoginIcon';
import { LoginTextInput } from './LoginTextInput';
import { Theme } from '@common/styles';
import { AppVersion } from '../AppVersion';
import { LanguageButton } from '../LanguageButton';

// LoginIcon runs media-query / theme / local-storage hooks; memoising it keeps
// it from re-rendering while the user types into the form fields below it.
const MemoLoginIcon = React.memo(LoginIcon);

export type LoginFormProps = {
  onLogin: (username: string, password: string) => Promise<void>;
  isLoggingIn: boolean;
  mostRecentUsername?: string;
  ErrorMessage: React.ReactNode;
  fullSize: boolean;
};

export type LoginLayoutProps = LoginFormProps & {
  SiteInfo: React.ReactNode;
  StoreSelector?: React.ReactNode;
  showStoreSelector?: boolean;
};

export const LoginLayout = ({
  onLogin,
  isLoggingIn,
  mostRecentUsername,
  ErrorMessage,
  SiteInfo,
  fullSize,
  StoreSelector,
  showStoreSelector = false,
}: LoginLayoutProps) => {
  const t = useTranslation();
  const loginForm = (
    <LoginForm
      onLogin={onLogin}
      isLoggingIn={isLoggingIn}
      mostRecentUsername={mostRecentUsername}
      ErrorMessage={ErrorMessage}
      fullSize={fullSize}
    />
  );

  return !fullSize ? (
    loginForm
  ) : (
    <Box display="flex" style={{ width: '100%' }}>
      <Box
        flex="1 0 50%"
        sx={theme => ({
          [theme.breakpoints.down('sm')]: {
            display: 'none',
          },
          backgroundImage: (theme: Theme) => theme.mixins.gradient.primary,
          backgroundSize: (theme: Theme) => theme.mixins.gradient.size,
          backgroundPosition: (theme: Theme) => theme.mixins.gradient.position,
          padding: '0 5% 7%',
        })}
        display="flex"
        alignItems="flex-start"
        justifyContent="flex-end"
        flexDirection="column"
      >
        <Box>
          <Typography
            sx={{
              color: (theme: Theme) => theme.typography.login.color,
              fontSize: {
                xs: '28px',
                sm: '30px',
                md: '48px',
                lg: '64px',
                xl: '64px',
              },
              fontWeight: 'bold',
              lineHeight: 'normal',
              whiteSpace: 'pre-line',
            }}
          >
            {t('login.heading')}
          </Typography>
        </Box>
        <Box style={{ marginTop: 45 }}>
          <Typography
            sx={{
              fontSize: {
                xs: '12px',
                sm: '14px',
                md: '16px',
                lg: '20px',
                xl: '20px',
              },
              color: (theme: Theme) => theme.typography.login.color,
              fontWeight: 600,
            }}
          >
            {t('login.body')}
          </Typography>
        </Box>
      </Box>
      <Box
        flex="1 0 50%"
        sx={{
          backgroundColor: 'background.login',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <Box
          inert={showStoreSelector}
          aria-hidden={showStoreSelector}
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            overflowY: 'auto',
            transition: 'transform 0.35s ease-in-out',
            transform: showStoreSelector ? 'translateX(-100%)' : 'translateX(0)',
          }}
        >
          <Box display="flex" flexGrow={1} sx={{ alignItems: 'center' }}>
            {loginForm}
          </Box>
          <AppVersion style={{ opacity: 0.4 }} SiteInfo={SiteInfo} />
          <LanguageButton />
        </Box>
        <Box
          inert={!showStoreSelector}
          aria-hidden={!showStoreSelector}
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
            transition: 'transform 0.35s ease-in-out',
            transform: showStoreSelector ? 'translateX(0)' : 'translateX(100%)',
          }}
        >
          {StoreSelector}
        </Box>
      </Box>
    </Box>
  );
};

const LoginForm = ({
  onLogin,
  isLoggingIn,
  mostRecentUsername,
  ErrorMessage,
  fullSize,
}: LoginFormProps) => {
  const t = useTranslation();
  const passwordRef = useRef<HTMLInputElement>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const isValid = !!username && !!password;

  const submit = async () => {
    if (!isValid) return;
    await onLogin(username, password);
    setPassword('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key === 'Enter') submit();
  };

  // Pre-fill the most recently used username (arrives asynchronously) and move
  // focus to the password field.
  useEffect(() => {
    if (mostRecentUsername && !username) {
      setUsername(mostRecentUsername);
      setTimeout(() => passwordRef.current?.focus(), 100);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mostRecentUsername]);

  return (
    <form onSubmit={e => e.preventDefault()} onKeyDown={handleKeyDown}>
      <Stack spacing={fullSize ? 5 : 2}>
        {fullSize && (
          <Box display="flex" justifyContent="center">
            <MemoLoginIcon />
          </Box>
        )}
        <LoginTextInput
          fullWidth
          label={t('heading.username')}
          value={username}
          disabled={isLoggingIn}
          onChange={e => setUsername(e.target.value)}
          slotProps={{
            htmlInput: {
              autoComplete: 'username',
              name: 'username',
            },
          }}
          autoFocus
        />
        <LoginTextInput
          fullWidth
          label={t('heading.password')}
          type="password"
          value={password}
          disabled={isLoggingIn}
          onChange={e => setPassword(e.target.value)}
          slotProps={{
            htmlInput: {
              autoComplete: 'current-password',
              name: 'password',
            },
          }}
          inputRef={passwordRef}
        />
        {ErrorMessage}
        <Box display="flex" justifyContent="flex-end">
          <LoadingButton
            shouldShrink={false}
            isLoading={isLoggingIn}
            onClick={submit}
            variant="outlined"
            endIcon={<ArrowRightIcon />}
            disabled={!isValid}
            label={t('button.login')}
          />
        </Box>
      </Stack>
    </form>
  );
};
