import React from 'react';
import {
  Box,
  CircularProgress,
  LinearProgress,
  Typography,
} from '@mui/material';
import { useTranslation } from '@common/intl';
import { ScannerInstallState } from '@common/utils';

interface ScannerInstallingProps {
  progress?: number;
  state?: ScannerInstallState;
}

export const ScannerInstalling: React.FC<ScannerInstallingProps> = ({
  progress = 0,
  state = ScannerInstallState.Installing,
}) => {
  const t = useTranslation();

  const getMessage = () => {
    switch (state) {
      case ScannerInstallState.Checking:
        return t('messages.scanner-checking');
      case ScannerInstallState.Installing:
        return progress > 0 && progress < 100
          ? t('messages.scanner-downloading')
          : t('messages.scanner-installing');
      case ScannerInstallState.Failed:
        return t('error.scanner-installation-failed');
      default:
        return t('messages.scanner-installing');
    }
  };

  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      padding={2}
      gap={1}
    >
      <CircularProgress size={40} color="secondary" />
      <Typography variant="body2" color="text.secondary">
        {getMessage()}
      </Typography>
      {progress > 0 && progress < 100 && (
        <Box width="100%" maxWidth={200}>
          <LinearProgress
            variant="determinate"
            value={progress}
            color="secondary"
          />
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: 'block', textAlign: 'center', mt: 0.5 }}
          >
            {Math.round(progress)}%
          </Typography>
        </Box>
      )}
    </Box>
  );
};
