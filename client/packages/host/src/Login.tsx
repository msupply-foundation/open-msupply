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
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { AutocompleteRenderInputParams } from '@mui/material/Autocomplete';

export const Login: React.FC = ({}) => {
  const navigate = useNavigate();
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
      label="Store"
    />
  );

  return (
    <Box display="flex">
      <Box
        flex="1 0 50%"
        sx={{
          backgroundImage: 'linear-gradient(156deg, #f80 4%, #e63535 96%)',
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
              color: '#fafafa',
              fontSize: '64px',
              fontWeight: 'bold',
              lineHeight: 'normal',
            }}
          >
            Simple.
            <br />
            Powerful. Pharmaceutical Management.
          </Typography>
        </Box>
        <Box style={{ marginTop: 45 }}>
          <Typography
            sx={{ fontSize: '20px', color: '#fafafa', fontWeight: 600 }}
          >
            Whether you run a pharmaceutical distribution warehouse, or are a
            manufacturer needing dozens of connected users, or a small
            dispensary, mSupply is a valuable partner.
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
            <LoginTextInput fullWidth label="Username" />
            <LoginTextInput fullWidth label="Password" type="password" />
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
                Log in
              </BaseButton>
            </Box>
          </Stack>
        </Box>
      </Box>
    </Box>
  );
};
