import { useEffect } from 'react';
import { PluginNode } from '@common/types';
import {
  ColumnPlugin,
  ComponentPlugin,
  PluginDefinition,
  usePluginProvider,
} from '@openmsupply-client/common';
import { useHost } from '../api';

// Used for local plugins in dev mode
declare const LOCAL_PLUGINS: PluginNode[];

interface PluginColumns {
  module: string;
  type: string;
}

interface PluginComponents {
  localModule?: string;
  module: string;
  type: string;
}

interface PluginDependencies {
  omSupplyVersion: string;
}

interface PluginConfig {
  name: string;
  version: string;
  columns?: PluginColumns[];
  components: PluginComponents[];
  dependencies: PluginDependencies;
}

const mapPlugin = (plugin: PluginNode): PluginDefinition | null => {
  const { config, path } = plugin;
  try {
    const componentPlugins: ComponentPlugin[] = [];
    const columnPlugins: ColumnPlugin[] = [];
    const pluginConfig = JSON.parse(config) as PluginConfig;

    pluginConfig.components?.forEach(component => {
      const { type, module, localModule } = component;
      componentPlugins.push({
        isLoaded: false,
        localModule,
        module,
        name: pluginConfig.name,
        type,
      } as ComponentPlugin);
    });
    pluginConfig.columns?.forEach(column => {
      const { type, module } = column;
      columnPlugins.push({
        isLoaded: false,
        module,
        name: pluginConfig.name,
        type,
      } as ColumnPlugin);
    });
    return { columnPlugins, componentPlugins };
  } catch (e) {
    console.error(
      `Failed to parse plugin config for plugin ${path}`,
      e,
      config
    );
  }
  return null;
};

export const useInitPlugins = () => {
  const { addComponentPlugin, addColumnPlugin } = usePluginProvider();
  const { data } = useHost.plugins.list();
  const initRemotePlugins = (data?: PluginNode[]) => {
    (
      (data?.map(mapPlugin).filter(plugin => plugin !== null) ??
        []) as PluginDefinition[]
    ).forEach(({ columnPlugins, componentPlugins }) => {
      columnPlugins.forEach(plugin => addColumnPlugin(plugin));
      componentPlugins.forEach(plugin => addComponentPlugin(plugin));
    });
  };

  // For hot reloading in dev mode plugins will be loaded from ./plugin folder
  const initLocalPlugins = async () => {
    for (const plugin of LOCAL_PLUGINS ?? []) {
      const plugins = mapPlugin(plugin);
      const handleImportError = (e: Error) =>
        console.error(`Unable to load plugin ${plugin.name}: ${e.message}`);

      plugins?.componentPlugins.forEach(mapped => {
        const module = mapped.localModule ?? mapped.module;
        import(
          // Using the localModule property to load the inner component
          // when loading directly like this, the component has access to app context
          // which it does not when loading async via webpack module federation
          // Webpack will actually try to load everything in plugins directory
          // which causes issues
          /* webpackExclude: /node_modules/ */
          /* webpackExclude: /operations.graphql/ */
          `../../../plugins/${plugin.path}/src/${module}`
        )
          .then(module => {
            mapped.Component = module.default;
            mapped.isLoaded = true;
            addComponentPlugin(mapped);
          })
          .catch(handleImportError);
      });
      plugins?.columnPlugins.forEach(mapped => {
        import(
          // Webpack will actually try to load everything in plugins directory
          // which causes issues
          /* webpackExclude: /node_modules/ */
          /* webpackExclude: /operations.graphql/ */
          `../../../plugins/${plugin.path}/src/${mapped.module}`
        )
          .then(module => {
            mapped.column = module.default;
            mapped.isLoaded = true;
            addColumnPlugin(mapped);
          })
          .catch(handleImportError);
      });
    }
  };

  useEffect(() => {
    if (process.env['NODE_ENV'] === 'production') initRemotePlugins(data);
    else initLocalPlugins();
  }, [data]);
};
