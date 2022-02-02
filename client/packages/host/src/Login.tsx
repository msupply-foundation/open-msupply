import React from 'react';
import {
  ArrowRightIcon,
  BaseButton,
  Box,
  MSupplyGuyGradient,
  Stack,
  LoginTextInput,
  Typography,
  useNavigate,
  Autocomplete,
  useTranslation,
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { AutocompleteRenderInputParams } from '@mui/material/Autocomplete';

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
  const renderAutocompleteInput = (props: AutocompleteRenderInputParams) => (
    <LoginTextInput
      {...props}
      InputProps={{ ...props.InputProps }}
      style={{ width: 282 }}
      label={t('heading.store')}
    />
  );

  return (
    <Box display="flex">
      <Box
        flex="1 0 50%"
        sx={{
          backgroundImage: theme =>
            `linear-gradient(156deg, ${theme.palette.background.gradient.from} 4%, ${theme.palette.background.gradient.to} 96%)`,
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
          backgroundColor: 'background.drawer',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        display="flex"
      >
        <Box style={{ width: 285 }}>
          <Stack spacing={5}>
            <Box display="flex" justifyContent="center">
              <MSupplyGuyGradient style={{ width: 122, height: 180 }} />
            </Box>
            <LoginTextInput fullWidth label={t('heading.username')} />
            <LoginTextInput
              fullWidth
              label={t('heading.password')}
              type="password"
            />
            <Autocomplete
              options={stores}
              width="282px"
              renderInput={renderAutocompleteInput}
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
