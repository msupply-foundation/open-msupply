import {
  loadRemotePlugin,
  usePluginProvider,
  usePlugins,
  type Plugins,
} from '@openmsupply-client/common';
import { useEffect } from 'react';

// Used for local plugins in dev mode
declare const LOCAL_PLUGINS: { pluginPath: string; pluginCode: string }[];

// Vite resolves this glob at build/serve time; values are lazy importers
const localPluginModules = import.meta.glob(
  '../../plugins/**/src/plugin.tsx'
);

export const useInitPlugins = () => {
  const { addPluginBundle } = usePluginProvider();
  const { query } = usePlugins();

  const initRemotePlugins = async () => {
    const plugins = await query();

    for (const plugin of plugins) {
      const pluginBundle = await loadRemotePlugin(plugin);
      addPluginBundle(pluginBundle, plugin.code);
    }
  };

  // For hot reloading in dev mode plugins will be loaded from ./plugin folder
  const initLocalPlugins = async () => {
    for (const plugin of LOCAL_PLUGINS) {
      const key = `../../plugins/${plugin.pluginPath}/src/plugin.tsx`;
      const importer = localPluginModules[key];
      if (!importer) continue;
      const bundle = (await importer()) as { default: Plugins };
      addPluginBundle(bundle.default, plugin.pluginCode);
    }
  };
  useEffect(() => {
    if (process.env['NODE_ENV'] === 'production') initRemotePlugins();
    else initLocalPlugins();
  }, []);
};
