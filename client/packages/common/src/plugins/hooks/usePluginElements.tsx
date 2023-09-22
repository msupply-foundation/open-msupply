import React from 'react';
import { ComponentPluginType } from '../types';
import { RecordWithId } from '../../types/utility';
import { usePluginProvider } from '../components';
import { PluginLoader } from '../components';

export function usePluginElements<T extends RecordWithId>({
  type,
  data,
}: {
  type: ComponentPluginType;
  data?: T;
}) {
  const getComponentPlugins = usePluginProvider(
    state => state.getComponentPlugins
  );
  const plugins = getComponentPlugins(type);

  return plugins.map(plugin =>
    plugin.isLoaded ? (
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      React.createElement<{ data: any }>(plugin.Component, {
        data,
        key: plugin.name,
      })
    ) : (
      <PluginLoader
        name={plugin.name}
        module={plugin.module}
        data={data}
        key={`${plugin.name}-${plugin.module}`}
      />
    )
  );
}
