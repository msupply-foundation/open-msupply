import {
  create,
  isArray,
  mergeWith,
  PluginNode,
  Plugins,
} from '@openmsupply-client/common';
import { useEffect } from 'react';
import { usePlugins } from './api/usePlugins';

// PLUGIN PROVIDER
type PluginProvider = {
  plugins: Plugins;
  addPlugins: (_: Plugins) => void;
};

export const usePluginProvider = create<PluginProvider>(set => {
  return {
    plugins: {},
    addPlugins: plugins => {
      set(state => {
        // Here can determine if version is suitable
        const newPlugins = mergeWith(state.plugins, plugins, (a, b) =>
          isArray(a) ? a.concat(b) : undefined
        );

        return { ...state, plugins: newPlugins };
      });
    },
  };
});

// PLUGINS INIT

// Used for local plugins in dev mode
declare const LOCAL_PLUGINS: { fileName: string }[];
// LOAD REACT PLUGIN

// LOAD REMOTE PLUGIN
type Factory = Promise<() => { default: Plugins }>;

type Container = {
  get: (module: string) => Factory;
  init: (shareScope: unknown) => Promise<void>;
};

export const fetchPlugin = (pluginNode: PluginNode): Promise<Container> =>
  new Promise((resolve, reject) => {
    // We define a script tag to use the browser for fetching the plugin js file
    const script = document.createElement('script');
    script.src = `${pluginNode.path}}/${pluginNode.name}.js`;
    script.onerror = err => {
      const message = typeof err === 'string' ? err : 'unknown';
      reject(
        new Error(
          `Failed to fetch remote: ${pluginNode.name}. Error: ${message}`
        )
      );
    };

    // When the script is loaded we need to resolve the promise back to Module Federation
    script.onload = () => {
      // The script is now loaded on window using the name defined within the remote
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const container = window[pluginNode.name as any] as unknown as Container;
      if (!container)
        reject(new Error(`Failed to load plugin: ${pluginNode.name}`));

      const proxy = {
        get: async (request: string) => container.get(request),
        init: (scope: unknown) => container.init(scope),
      };
      resolve(proxy);
    };
    // Lastly we inject the script tag into the document's head to trigger the script load
    document.head.appendChild(script);
  });

/* eslint-disable camelcase */
declare const __webpack_init_sharing__: (shareScope: string) => Promise<void>;
declare const __webpack_share_scopes__: Record<string, unknown>;

export const loadRemotePlugin = async (
  pluginNode: PluginNode
): Promise<Plugins> => {
  try {
    // Check if this plugin has already been loaded
    if (!(pluginNode.name in window)) {
      // Initializes the shared scope. Fills it with known provided modules from this build and all remotes
      await __webpack_init_sharing__('default');
      // Fetch the plugin app
      const fetchedContainer = await fetchPlugin(pluginNode);
      // Initialize the plugin app
      await fetchedContainer.init(__webpack_share_scopes__['default']);
    }
    // `container` is the plugin app
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const container = window[pluginNode.name as any] as unknown as Container;
    if (!container)
      throw new Error(`Failed to load plugin: ${pluginNode.name}`);

    // The module passed to get() must match the `exposes` item in our plugin app's webpack.config
    // this is always set as "plugin" in plugin's webpack
    const factory = await container.get('plugin');

    // `Module` is the React Component exported from the plugin
    const Module = factory?.();
    if (!Module?.default)
      throw new Error(`Failed to load plugin: ${pluginNode.name}`);

    return Module.default;
  } catch (e) {
    console.error(e);
    throw new Error('Failed to load plugin');
  }
};

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
      let pluginBundle = await import(
        // Webpack will actually try to load everything in plugins directory
        // which causes issues
        /* webpackExclude: /node_modules/ */
        `./plugins/${plugin.fileName}/src/plugin.tsx`
      );
      addPlugins(pluginBundle.default);
    }
  };

  useEffect(() => {
    if (process.env['NODE_ENV'] === 'production') initRemotePlugins();
    else initLocalPlugins();
  }, []);
};
