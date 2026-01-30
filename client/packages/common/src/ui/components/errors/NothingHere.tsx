/* eslint-disable @typescript-eslint/no-var-requires */
import React from 'react';
import { useTranslation } from '@common/intl';
import { Box, Stack, Typography, Button } from '@mui/material';
import { NothingHereIcon } from './NothingHereIcon';
export interface NothingHereProps {
  title?: string;
  body?: string;
  buttonText?: string;
  onCreate?: () => void;
}

export const NothingHere: React.FC<NothingHereProps> = ({
  body,
  buttonText,
  title,
  onCreate,
}) => {
  const t = useTranslation();
  const heading = title || t('error.no-results');
  const createButtonText = buttonText || t('button.create-a-new-one');

  const CreateButton = !!onCreate ? (
    <Button
      sx={{
        textTransform: 'none',
        color: 'secondary.main',
      }}
      onClick={() => onCreate()}
    >
      {createButtonText}
    </Button>
  ) : undefined;

  const Body = !!body ? (
    <Typography fontSize={14} sx={{ color: 'gray.main' }} display="inline">
      {body}
    </Typography>
  ) : undefined;

  return (
    <Stack
      flex={1}
      justifyContent="center"
      alignItems="center"
      height="100%"
      padding={1}
    >
      <NothingHereIcon sx={{ fontSize: 120 }} />
      <Box justifyContent="center">
        <Typography fontSize={24} fontWeight={700} sx={{ color: 'gray.light' }}>
          {heading}
        </Typography>
      </Box>
      <Box display="inline">
        {Body}
        {CreateButton}
      </Box>
    </Stack>
  );
};
