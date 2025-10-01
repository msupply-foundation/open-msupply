/* eslint-disable @typescript-eslint/no-var-requires */
import React from 'react';
import { useTranslation } from '@common/intl';
import { Box, Stack, Typography, Button } from '@mui/material';
import { NothingHereIcon } from './NothingHereIcon';
import { useAppTheme } from '@common/styles';
export interface NothingHereProps {
  title?: string;
  body?: string;
  buttonText?: string;
  onCreate?: () => void;
  isError?: boolean;
}

export const NothingHere: React.FC<NothingHereProps> = ({
  body,
  buttonText,
  title,
  onCreate,
  isError = false,
}) => {
  const t = useTranslation();
  const theme = useAppTheme();
  const heading = title || (isError ? '' : t('error.no-results'));
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
    <Typography
      fontSize={14}
      sx={{ color: isError ? 'error.main' : 'gray.main' }}
      display="inline"
    >
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
      <NothingHereIcon
        sx={{ fontSize: 120 }}
        fill={isError ? theme.palette.background.error : undefined}
      />
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
