import React from 'react';
import {
  ComponentPlugin,
  ComponentPluginData,
  ComponentPluginType,
  PluginModule,
} from '../types';
import { usePluginProvider } from '../components';
import { PluginLoader } from '../components';

const mapComponentPlugin = <T extends ComponentPluginType>(
  component: Extract<ComponentPlugin, { type: T }>,
  data?: ComponentPluginData<T>
) => {
  const Component = () =>
    new Promise<PluginModule<unknown>>(resolve => {
      component
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
      key={`${component.pluginName}-${component.module}`}
      name={component.pluginName}
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
  const getComponentPlugins = usePluginProvider(
    state => state.getComponentPlugins
  );
  const plugins = getComponentPlugins(type);

  return plugins.map((plugin: Extract<ComponentPlugin, { type: T }>) =>
    mapComponentPlugin(plugin, data)
  );
}
