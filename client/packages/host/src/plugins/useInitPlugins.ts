import { useEffect } from 'react';
import { PluginNode, RecordWithId } from '@common/types';
import {
  ColumnDefinition,
  ColumnPlugin,
  ComponentPlugin,
  PluginDefinition,
  usePluginProvider,
  loadPluginColumn,
  loadPluginModule,
  ComponentPluginData,
  ComponentPluginType,
  PluginModule,
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
  type: ComponentPluginType;
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

    pluginConfig.components?.forEach((component: PluginComponents) => {
      const { type, module, localModule } = component;
      componentPlugins.push({
        component: loadPluginModule<ComponentPluginData<unknown>>({
          plugin: pluginConfig.name,
          module,
        }),
        localModule,
        module,
        name: pluginConfig.name,
        type,
      } as ComponentPlugin);
    });
    pluginConfig.columns?.forEach(column => {
      const { type, module } = column;
      const name = pluginConfig.name;
      columnPlugins.push({
        column: () =>
          loadPluginColumn({ plugin: name, module })().then(
            module => module.default
          ),
        module,
        name,
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
            mapped.component = <T>() =>
              new Promise<PluginModule<T>>((resolve, reject) => {
                if (module.default) {
                  resolve(module);
                } else {
                  reject(
                    new Error(
                      `Unable to load plugin ${mapped.module}. Check that the module has a default export.`
                    )
                  );
                }
              });

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
            mapped.column = <T extends RecordWithId>() =>
              new Promise<ColumnDefinition<T>>(resolve =>
                resolve(module.default)
              );
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
