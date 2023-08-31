import React, { ComponentType } from 'react';
import { Environment } from '@openmsupply-client/config';
import { Box, CircularProgress } from '@mui/material';
import { ErrorBoundary, ErrorWithDetails, useTranslation } from '../..';
import { loadPlugin } from '../utils';

interface PluginLoaderProps {
  module: string;
  name: string;
  path: string;
  data?: unknown;
  scope?: string;
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

export const PluginLoader = ({
  data,
  module,
  name,
  scope,
}: PluginLoaderProps) => {
  const PluginUnavailable = () => {
    const t = useTranslation('plugin');

    return (
      <ErrorWithDetails
        error={t('error.plugin-unavailable')}
        details={t('error.plugin', { name })}
      />
    );
  };

  const url = `${Environment.PLUGIN_URL}/${name}${Environment.PLUGIN_EXTENSION}`;
  const Component = React.lazy<ComponentType<{ data: unknown }>>(
    loadPlugin({ plugin: name, url, module, scope })
  );

  return (
    <ErrorBoundary Fallback={PluginUnavailable}>
      <React.Suspense fallback={Loader}>
        <Component data={data} />
      </React.Suspense>
    </ErrorBoundary>
  );
};
