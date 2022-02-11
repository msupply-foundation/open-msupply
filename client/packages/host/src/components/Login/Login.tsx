import React from 'react';
import {
  ArrowRightIcon,
  Box,
  Stack,
  Typography,
  Autocomplete,
  useTranslation,
  AutocompleteRenderInputParams,
  defaultOptionMapper,
  Store,
  LoadingButton,
  AlertIcon,
} from '@openmsupply-client/common';
import { LoginIcon } from './LoginIcon';
import { LoginTextInput } from './LoginTextInput';
import { useStores } from '@openmsupply-client/system';
import { useLoginForm } from './hooks';

const StoreAutocompleteInput: React.FC<
  AutocompleteRenderInputParams
> = props => {
  const t = useTranslation('app');
  return (
    <LoginTextInput
      {...props}
      InputProps={{ ...props.InputProps }}
      style={{ width: 282 }}
      label={t('heading.store')}
    />
  );
};

const storeSorter = (a: Store, b: Store) => {
  if (a.code < b.code) return -1;
  if (a.code > b.code) return 1;
  return 0;
};

export const Login: React.FC = ({}) => {
  const t = useTranslation('app');
  const passwordRef = React.useRef(null);
  const {
    isValid,
    password,
    setPassword,
    store,
    setStore,
    username,
    setUsername,
    isLoggingIn,
    onLogin,
    authenticationResponse,
  } = useLoginForm(passwordRef);

  const { data, isLoading } = useStores();
  const undefinedStore = {
    label: '',
    id: '',
    code: '',
  };
  const stores = [
    undefinedStore,
    ...defaultOptionMapper((data?.nodes ?? []).sort(storeSorter), 'code'),
  ];

  const currentStore = stores.find(s => s.id === store?.id) || undefinedStore;
  const handleKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key === 'Enter' && isValid) {
      onLogin();
    }
  };

  return (
    <Box display="flex">
      <Box
        flex="1 0 50%"
        sx={{
          backgroundImage: theme => theme.mixins.gradient.primary,
          padding: '0 80px 7% 80px',
        }}
        display="flex"
        alignItems="flex-start"
        justifyContent="flex-end"
        flexDirection="column"
      >
        <Box>
          <Typography
            sx={{
              color: theme => theme.typography.login.color,
              fontSize: '64px',
              fontWeight: 'bold',
              lineHeight: 'normal',
              maxWidth: '525px',
            }}
          >
            {t('login.heading')}
          </Typography>
        </Box>
        <Box style={{ marginTop: 45 }}>
          <Typography
            sx={{
              fontSize: theme => theme.typography.login.fontSize,
              color: theme => theme.typography.login.color,
              fontWeight: theme => theme.typography.login.fontWeight,
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
          alignItems: 'center',
          justifyContent: 'center',
        }}
        display="flex"
      >
        <Box style={{ width: 285 }}>
          <form onSubmit={onLogin} onKeyDown={handleKeyDown}>
            <Stack spacing={5}>
              <Box display="flex" justifyContent="center">
                <LoginIcon />
              </Box>
              <LoginTextInput
                fullWidth
                label={t('heading.username')}
                value={username}
                onChange={e => setUsername(e.target.value)}
                inputProps={{
                  autoComplete: 'username',
                }}
                autoFocus
              />
              <LoginTextInput
                fullWidth
                label={t('heading.password')}
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                inputProps={{
                  autoComplete: 'current-password',
                }}
                inputRef={passwordRef}
              />
              <Autocomplete
                renderInput={StoreAutocompleteInput}
                loading={isLoading}
                options={stores}
                onChange={(_, value) => setStore(value || undefined)}
                value={currentStore}
                isOptionEqualToValue={(option, value) => option.id === value.id}
              />
              {authenticationResponse?.error && (
                <Box display="flex" sx={{ color: 'error.main' }} gap={1}>
                  <Box>
                    <AlertIcon />
                  </Box>
                  <Box>
                    <Typography sx={{ color: 'inherit' }}>
                      {authenticationResponse?.error.message ||
                        t('error.login')}
                    </Typography>
                  </Box>
                </Box>
              )}
              <Box display="flex" justifyContent="flex-end">
                <LoadingButton
                  isLoading={isLoggingIn}
                  onClick={onLogin}
                  variant="outlined"
                  endIcon={<ArrowRightIcon />}
                  disabled={!isValid}
                >
                  {t('button.login')}
                </LoadingButton>
              </Box>
            </Stack>
          </form>
        </Box>
      </Box>
    </Box>
  );
};
