import React, { ComponentType } from 'react';
import { Box, CircularProgress } from '@mui/material';
import {
  ErrorBoundary,
  ErrorWithDetails,
  PluginModule,
  useTranslation,
} from '../..';

interface PluginLoaderProps<T> {
  Component: () => Promise<PluginModule<T>>;
  data?: T;
  name: string;
}
const Loader = (
  <Box
    display="flex"
    style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
    }}
  >
    <CircularProgress size={15} />
  </Box>
);

export function PluginLoader<T>({
  Component,
  data,
  name,
}: PluginLoaderProps<T>) {
  const PluginUnavailable = () => {
    const t = useTranslation('plugin');

    return (
      <ErrorWithDetails
        error={t('error.plugin-unavailable')}
        details={t('error.plugin', { name })}
      />
    );
  };

  const Plugin = React.lazy<ComponentType<{ data?: T }>>(Component);

  return (
    <ErrorBoundary Fallback={PluginUnavailable}>
      <React.Suspense fallback={Loader}>
        <Plugin data={data} />
      </React.Suspense>
    </ErrorBoundary>
  );
}
