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
        data: T;
      }) {
        return (plugins as Plugin<T>[])
          .filter(plugin => plugin.area === area && plugin.type === type)
          .map(plugin => (
            <PluginLoader
              name={plugin.name}
              module={plugin.module}
              data={data}
              path={plugin.path}
              key={plugin.name}
            />
          ));
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
