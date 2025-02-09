import {
  loadRemotePlugin,
  usePluginProvider,
  usePlugins,
} from '@openmsupply-client/common';
import { Environment } from 'packages/config/src';
import { useEffect } from 'react';

// Used for local plugins in dev mode
declare const LOCAL_PLUGINS: { name: string }[];

export const useInitPlugins = () => {
  const { addPlugins } = usePluginProvider();
  const { query } = usePlugins();

  const initRemotePlugins = async () => {
    const plugins = await query();

    for (const plugin of plugins) {
      let pluginBundle = await loadRemotePlugin(plugin);
      addPlugins(pluginBundle);
    }
  };

  // For hot reloading in dev mode plugins will be loaded from ./plugin folder
  const initLocalPlugins = async () => {
    for (const plugin of LOCAL_PLUGINS) {
      // This command must be located in 'host', tried in common and webpack throws an error
      // "Critical dependency: the request of a dependency is an expression"
      const pluginBundle = await import(
        // Webpack will actually try to load everything in plugins directory
        // which causes issues
        /* webpackExclude: /node_modules/ */
        /* webpackExclude: /operations.graphql/ */
        `../../plugins/${plugin.name}/src/plugin.tsx`
      );
      addPlugins(pluginBundle.default);
    }
  };
  useEffect(() => {
    if (
      process.env['NODE_ENV'] === 'production' ||
      Environment.LOAD_REMOTE_PLUGINS
    )
      initRemotePlugins();
    else initLocalPlugins();
  }, []);
};
