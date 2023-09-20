import React from 'react';
import {
  ComponentPlugin,
  ComponentPluginData,
  ComponentPluginType,
  PluginModule,
} from '../types';
import { usePluginProvider } from '../components';
import { PluginLoader } from '../components';

const mapPlugin = <T extends ComponentPluginType>(
  plugin: Extract<ComponentPlugin, { type: T }>,
  data?: ComponentPluginData<T>
) => {
  const Component = () =>
    new Promise<PluginModule<unknown>>(resolve => {
      plugin
        .component()
        .then(module => resolve(module as PluginModule<unknown>))
        .catch(e => {
          console.error(e);
          resolve({ default: () => null });
        });
    });

  return (
    <PluginLoader
      Component={Component}
      data={data}
      key={`${plugin.name}-${plugin.module}`}
      name={plugin.name}
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
