import React from 'react';
import {
  ArrowRightIcon,
  Box,
  Stack,
  Typography,
  useNavigate,
  Autocomplete,
  useTranslation,
  AutocompleteRenderInputParams,
  defaultOptionMapper,
  Store,
  LoadingButton,
  AlertIcon,
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { LoginIcon } from './LoginIcon';
import { LoginTextInput } from './LoginTextInput';
import { useStores } from '@openmsupply-client/system';
import create from 'zustand';
import { useAuthToken } from './api';

const StoreAutocompleteInput: React.FC<AutocompleteRenderInputParams> =
  props => {
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

interface LoginForm {
  isLoggingIn: boolean;
  password: string;
  storeId?: string;
  username: string;
  setIsLoggingIn: (isLoggingIn: boolean) => void;
  setPassword: (password: string) => void;
  setStoreId: (storeId?: string) => void;
  setUsername: (username: string) => void;
}
const useLoginForm = create<LoginForm>(set => ({
  isLoggingIn: false,
  password: '',
  storeId: undefined,
  username: '',
  setIsLoggingIn: (isLoggingIn: boolean) =>
    set(state => ({ ...state, isLoggingIn })),
  setPassword: (password: string) => set(state => ({ ...state, password })),
  setStoreId: (storeId?: string) => set(state => ({ ...state, storeId })),
  setUsername: (username: string) => set(state => ({ ...state, username })),
}));

export const Login: React.FC = ({}) => {
  const navigate = useNavigate();
  const t = useTranslation('app');
  const {
    password,
    setPassword,
    storeId,
    setStoreId,
    username,
    setUsername,
    isLoggingIn,
    setIsLoggingIn,
  } = useLoginForm();

  const onLogin = () => {
    setIsLoggingIn(true);
  };
  const { data, isLoading } = useStores();
  const { data: authenticationResponse, isLoading: isAuthenticating } =
    useAuthToken({ username, password }, isLoggingIn);

  const undefinedStore = {
    label: '',
    id: '',
    code: '',
  };
  const stores = [
    undefinedStore,
    ...defaultOptionMapper((data?.nodes ?? []).sort(storeSorter), 'code'),
  ];

  const currentStore =
    stores.find(store => store.id === storeId) || undefinedStore;

  React.useEffect(() => {
    setIsLoggingIn(isAuthenticating);
    if (authenticationResponse?.token) {
      setPassword('');
      navigate(`/${AppRoute.Dashboard}`);
    }
  }, [authenticationResponse, isAuthenticating]);

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
              color: theme => theme.typography.body2.color,
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
              fontSize: theme => theme.typography.body2.fontSize,
              color: theme => theme.typography.body2.color,
              fontWeight: theme => theme.typography.body2.fontWeight,
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
          <form onSubmit={onLogin}>
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
              />
              <Autocomplete
                renderInput={StoreAutocompleteInput}
                loading={isLoading}
                options={stores}
                onChange={(_, value) => setStoreId(value?.id)}
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
                  disabled={!username || !password || !storeId}
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
