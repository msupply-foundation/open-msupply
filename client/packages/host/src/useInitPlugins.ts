import {
  loadRemotePlugin,
  Plugins,
  useAuthContext,
  usePluginProvider,
  usePlugins,
} from '@openmsupply-client/common';
import { useEffect } from 'react';

// Used for local plugins in dev mode
declare const LOCAL_PLUGINS: { pluginPath: string; pluginCode: string }[];

export const useInitPlugins = () => {
  const { setPluginBundles } = usePluginProvider();
  const { query } = usePlugins();
  const { token, storeId, lastSuccessfulSync } = useAuthContext();

  const initRemotePlugins = async () => {
    const plugins = await query();

    const bundles: { code: string; bundle: Plugins }[] = [];
    for (const plugin of plugins) {
      const pluginBundle = await loadRemotePlugin(plugin);
      bundles.push({ code: plugin.code, bundle: pluginBundle });
    }

    // Replace the whole set rather than adding incrementally, so a plugin
    // deleted on the central server (and thus absent from `plugins`) is dropped
    // from the store once a sync re-runs this. See issue #12169 / #11988.
    setPluginBundles(bundles);
  };

  // For hot reloading in dev mode plugins will be loaded from ./plugin folder
  const initLocalPlugins = async () => {
    const bundles: { code: string; bundle: Plugins }[] = [];
    for (const plugin of LOCAL_PLUGINS) {
      // This command must be located in 'host', tried in common and webpack throws an error
      // "Critical dependency: the request of a dependency is an expression"
      const pluginBundle = await import(
        // Webpack will actually try to load everything in plugins directory
        // which causes issues
        /* webpackExclude: /node_modules/ */
        /* webpackExclude: /operations.graphql/ */
        `../../plugins/${plugin.pluginPath}/src/plugin.tsx`
      );
      bundles.push({ code: plugin.pluginCode, bundle: pluginBundle.default });
    }
    setPluginBundles(bundles);
  };
  // Local (dev) plugins are loaded from disk and don't depend on auth, so load
  // them once on mount.
  useEffect(() => {
    if (process.env['NODE_ENV'] !== 'production') initLocalPlugins();
  }, []);

  // Remote plugins are re-fetched whenever the auth context changes - on
  // login, store switch, or after a successful sync (lastSuccessfulSync). This
  // ensures newly uploaded or updated plugins appear without a full page
  // reload (previously only triggered by switching languages, which calls
  // navigate(0)). See issue #12169.
  useEffect(() => {
    if (process.env['NODE_ENV'] !== 'production') return;
    if (!token || !storeId) return;
    initRemotePlugins();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, storeId, lastSuccessfulSync]);
};
