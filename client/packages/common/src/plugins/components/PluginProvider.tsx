import React, {
  FC,
  PropsWithChildren,
  useState,
  useMemo,
  useEffect,
} from 'react';
import {
  PluginContext,
  PluginControllerState,
  PluginState,
} from './PluginContext';
import { Plugin, PluginArea, PluginType } from '../types';
import { PluginLoader } from './PluginLoader';
import { Environment } from '@openmsupply-client/config';
import { loadPluginColumn } from '../utils';

interface PluginProviderProps {
  plugins: Plugin<unknown>[];
}

export const PluginProvider: FC<PropsWithChildren<PluginProviderProps>> = ({
  children,
  plugins,
}) => {
  const [pluginState, setState] = useState<PluginState>({
    plugins: [],
  });

  const pluginController: PluginControllerState = useMemo(
    () => ({
      setState,
      setPlugins: (plugins: Plugin<unknown>[]) =>
        setState(state => ({ ...state, plugins })),
      getPlugins: (area: PluginArea, type: PluginType) =>
        plugins.filter(plugin => plugin.area === area && plugin.type === type),
      getPluginElements: function <T>({
        area,
        type,
        data,
      }: {
        area: PluginArea;
        type: PluginType;
        data?: T;
      }) {
        return (plugins as Plugin<T>[])
          .filter(plugin => plugin.area === area && plugin.type === type)
          .map(plugin => (
            <PluginLoader
              name={plugin.name}
              module={plugin.module}
              data={data}
              path={plugin.path}
              key={`${plugin.name}-${plugin.module}`}
            />
          ));
      },

      ...pluginState,
    }),
    [setState, pluginState]
  );

  const updateColumnPlugin = (plugin: Plugin<unknown>, column: unknown) => {
    const { plugins } = pluginState;
    const index = plugins.findIndex(
      p => p.name === plugin.name && p.module === plugin.module
    );
    if (index === -1) return;

    plugins[index] = { ...plugin, data: column };
  };

  useEffect(() => {
    plugins.forEach(async plugin => {
      if (plugin.area !== PluginArea.Column) return;

      const { name, module } = plugin;
      const url = `${Environment.PLUGIN_URL}/${name}${Environment.PLUGIN_EXTENSION}`;
      const column = await loadPluginColumn({ plugin: name, url, module })();
      updateColumnPlugin(plugin, column.default);
    });
    setState({ ...pluginState, plugins });
  }, [plugins]);

  return (
    <PluginContext.Provider value={pluginController}>
      {children}
    </PluginContext.Provider>
  );
};
