import React from 'react';
import {
  ArrowRightIcon,
  BaseButton,
  Box,
  Stack,
  Typography,
  useNavigate,
  Autocomplete,
  useTranslation,
  AutocompleteRenderInputParams,
  defaultOptionMapper,
  Store,
  // useHostContext,
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
  password: string;
  storeId?: string;
  username: string;
  setPassword: (password: string) => void;
  setStoreId: (storeId?: string) => void;
  setUsername: (username: string) => void;
}
const useLoginForm = create<LoginForm>(set => ({
  password: '',
  storeId: undefined,
  username: '',
  setPassword: (password: string) => set(state => ({ ...state, password })),
  setStoreId: (storeId?: string) => set(state => ({ ...state, storeId })),
  setUsername: (username: string) => set(state => ({ ...state, username })),
}));

export const Login: React.FC = ({}) => {
  const navigate = useNavigate();
  const t = useTranslation('app');
  const { password, setPassword, storeId, setStoreId, username, setUsername } =
    useLoginForm();
  const [isLoggingIn, setIsLoggingIn] = React.useState(false);

  const onLogin = () => {
    setIsLoggingIn(true);
  };
  const { data, isLoading } = useStores();
  const { data: authToken } = useAuthToken({ username, password }, isLoggingIn);

  const stores = defaultOptionMapper(
    (data?.nodes ?? []).sort(storeSorter),
    'code'
  );

  React.useEffect(() => {
    setIsLoggingIn(false);
    if (authToken) {
      navigate(`/${AppRoute.Dashboard}`);
    }
  }, [authToken]);

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
          <Stack spacing={5}>
            <Box display="flex" justifyContent="center">
              <LoginIcon />
            </Box>
            <LoginTextInput
              fullWidth
              label={t('heading.username')}
              value={username}
              onChange={e => setUsername(e.target.value)}
            />
            <LoginTextInput
              fullWidth
              label={t('heading.password')}
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
            <Autocomplete
              renderInput={StoreAutocompleteInput}
              loading={isLoading}
              options={stores}
              onChange={(_, value) => setStoreId(value?.id)}
              value={stores.find(store => store.id === storeId)}
            />
            <Box display="flex" justifyContent="flex-end">
              <BaseButton
                onClick={onLogin}
                variant="outlined"
                endIcon={<ArrowRightIcon />}
                disabled={!username || !password || !storeId || isLoggingIn}
              >
                {t('button.login')}
              </BaseButton>
            </Box>
          </Stack>
        </Box>
      </Box>
    </Box>
  );
};
