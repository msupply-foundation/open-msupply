import React from 'react';
import {
  ComponentPlugin,
  ComponentPluginData,
  ComponentPluginType,
} from '../types';
import { usePluginProvider } from '../components';
import { PluginLoader } from '../components';

const mapPlugin = <T extends ComponentPluginType>(
  plugin: Extract<ComponentPlugin, { type: T }>,
  data?: ComponentPluginData<T>
) => {
  if (plugin.isLoaded) {
    if (!plugin.Component) {
      console.error(
        `Plugin ${plugin.name} isLoaded but the Component is undefined. Check that the module has a default export.`
      );
      return null;
    }
    return (
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      React.createElement<{ data: any /* ComponentPluginData<T> */ }>(
        plugin.Component,
        {
          data,
          key: plugin.name,
        }
      )
    );
  }
  return (
    <PluginLoader
      name={plugin.name}
      module={plugin.module}
      data={data}
      key={`${plugin.name}-${plugin.module}`}
    />
  );
};

export function usePluginElements<T extends ComponentPluginType>({
  type,
  data,
}: {
  type: T;
  data?: ComponentPluginData<T>;
}) {
  const { getComponentPlugins } = usePluginProvider();
  const plugins = getComponentPlugins(type);

  return plugins.map((plugin: Extract<ComponentPlugin, { type: T }>) =>
    mapPlugin(plugin, data)
  );
}
