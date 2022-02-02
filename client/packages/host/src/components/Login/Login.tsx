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
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { LoginIcon } from './LoginIcon';
import { LoginTextInput } from './LoginTextInput';

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

export const Login: React.FC = ({}) => {
  const navigate = useNavigate();
  const t = useTranslation('app');
  const onLogin = () => {
    navigate(`/${AppRoute.Dashboard}`);
  };

  const stores = [
    { label: 'Store 1', value: 'store1' },
    { label: 'Store 2', value: 'store2' },
  ];

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
            <LoginTextInput fullWidth label={t('heading.username')} />
            <LoginTextInput
              fullWidth
              label={t('heading.password')}
              type="password"
            />
            <Autocomplete
              renderInput={StoreAutocompleteInput}
              options={stores}
            />
            <Box display="flex" justifyContent="flex-end">
              <BaseButton
                onClick={onLogin}
                variant="outlined"
                endIcon={<ArrowRightIcon />}
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
