import { BaseButton, Box, Stack, Typography } from "packages/common/src";
import React, { FC } from "react";

const LandingPageComponent: FC = () => {
  return (
    <Stack spacing={5}>
      <Typography variant="h3">mSupply Dispensing App</Typography>
      <Box display="flex" justifyContent="center">
        <BaseButton variant="contained">Issue</BaseButton>
      </Box>
      <Box display="flex" justifyContent="center">
        <BaseButton>View Issues</BaseButton>
      </Box>
    </Stack>
  );
};

export const LandingPage: FC = () => <LandingPageComponent />;
