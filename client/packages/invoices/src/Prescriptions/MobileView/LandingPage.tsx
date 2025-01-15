import {
  BaseButton,
  Box,
  FnUtils,
  RouteBuilder,
  Stack,
  Typography,
  useHostContext,
  useNavigate,
} from 'packages/common/src';
import { AppRoute } from 'packages/config/src';
import React, { FC, useEffect } from 'react';

const LandingPageComponent: FC = () => {
  const { fullScreen, setFullScreen } = useHostContext();
  const navigate = useNavigate();

  useEffect(() => {
    if (!fullScreen) {
      setFullScreen(true);
    }
  }, [fullScreen]);

  return (
    <Stack spacing={5}>
      <Typography sx={{ textAlign: 'center' }} variant="h3">
        mSupply Dispensing App
      </Typography>
      <Box display="flex" justifyContent="center">
        <BaseButton
          onClick={() => {
            const uuid = FnUtils.generateUUID();
            console.log('UUID:', uuid);
            navigate(
              RouteBuilder.create(AppRoute.Dispensary)
                .addPart(AppRoute.Mobile)
                .addPart(AppRoute.Prescription)
                .addPart(uuid)
                .build()
            );
          }}
          variant="contained"
        >
          Issue
        </BaseButton>
      </Box>
      <Box display="flex" justifyContent="center">
        <BaseButton
          onClick={() => {
            alert('Not Implemented');
          }}
        >
          View Issues
        </BaseButton>
      </Box>
    </Stack>
  );
};

export const LandingPage: FC = () => <LandingPageComponent />;
