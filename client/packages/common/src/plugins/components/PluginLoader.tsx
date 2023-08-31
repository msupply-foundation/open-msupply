import React, { ComponentType } from 'react';
import { Environment } from '@openmsupply-client/config';
import { Box, CircularProgress } from '@mui/material';
import { ErrorBoundary, ErrorWithDetails, useTranslation } from '../..';
import { loadPlugin } from '../utils';

/**
 * PluginLoaderProps
 * module: the name of the exposed component
 * name: the name of the plugin
 * path: file path for the plugin, possibly unnecessary now
 * data: is context specific data which is passed to the plugin, for example a plugin
 * on the InboundShipment DetailView will have an type of `InvoiceNode`
 * scope: the name of the scope used by webpack module federation
 */
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
