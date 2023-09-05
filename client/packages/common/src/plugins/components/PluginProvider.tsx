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
import { ColumnDefinition } from '../../ui';
import { loadPluginColumn } from '../utils';
import { RecordWithId } from '../../types/utility';

interface PluginProviderProps {
  plugins: Plugin<unknown>[];
}

const mapPluginToColumnDefinition = async <T extends RecordWithId>(
  plugin: Plugin<T>
): Promise<ColumnDefinition<T>> => {
  const { module, name } = plugin;
  const pluginColumn = await loadPluginColumn({ plugin: name, module })();

  return pluginColumn.default as unknown as ColumnDefinition<T>;
};

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
      getPluginElements: function <T>({
        area,
        type,
        data,
      }: {
        area: PluginArea;
        type: PluginType;
        data?: T;
      }) {
        return (pluginState.plugins as Plugin<T>[])
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
      getPluginColumns: function <T extends RecordWithId>({
        area,
        type,
      }: {
        area: PluginArea;
        type: PluginType;
      }) {
        const promises = (pluginState.plugins as Plugin<T>[])
          .filter(plugin => plugin.area === area && plugin.type === type)
          .map(mapPluginToColumnDefinition);

        return Promise.all(promises);
      },

      ...pluginState,
    }),
    [setState, pluginState]
  );

  useEffect(() => {
    setState({ ...pluginState, plugins });
  }, [plugins]);

  return (
    <PluginContext.Provider value={pluginController}>
      {children}
    </PluginContext.Provider>
  );
};
