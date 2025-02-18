import {
  create,
  FrontendPluginMetadataNode,
  isArray,
  mergeWith,
  Plugins,
} from '@openmsupply-client/common';
import { Environment } from '@openmsupply-client/config';

// PLUGIN PROVIDER
type PluginProvider = {
  plugins: Plugins;
  cachedPluginBundles: { [code: string]: Plugins };
  addPluginBundle: (bundle: Plugins, code: string) => void;
};

export const usePluginProvider = create<PluginProvider>(set => {
  return {
    plugins: {},
    cachedPluginBundles: {},
    addPluginBundle: (pluginBundle, code) => {
      set(state => {
        // Cache plugin bundles by code, to support hot reloading
        const cachedPluginBundles = {
          ...state.cachedPluginBundles,
          [code]: pluginBundle,
        };

        // TODO: Here can determine if version is suitable
        const plugins = Object.values(cachedPluginBundles).reduce(
          (acc, pluginBundle) =>
            mergeWith(acc, pluginBundle, (a, b) =>
              isArray(a) ? a.concat(b) : undefined
            ),
          {}
        );

        return {
          ...state,
          plugins,
          cachedPluginBundles,
        };
      });
    },
  };
});

// PLUGINS INIT

// LOAD REMOTE PLUGIN
type Factory = Promise<() => { default: Plugins }>;

type Container = {
  get: (module: string) => Factory;
  init: (shareScope: unknown) => Promise<void>;
};

export const fetchPlugin = (
  pluginNode: FrontendPluginMetadataNode
): Promise<Container> =>
  new Promise((resolve, reject) => {
    // We define a script tag to use the browser for fetching the plugin js file
    const script = document.createElement('script');
    script.src = `${Environment.API_HOST}/frontend_plugins/${pluginNode.path}`;
    script.onerror = err => {
      const message = typeof err === 'string' ? err : 'unknown';
      reject(
        new Error(
          `Failed to fetch remote: ${pluginNode.code}. Error: ${message}`
        )
      );
    };

    // When the script is loaded we need to resolve the promise back to Module Federation
    script.onload = () => {
      // The script is now loaded on window using the code defined within the remote
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const container = window[pluginNode.code as any] as unknown as Container;
      if (!container)
        reject(new Error(`Failed to load plugin: ${pluginNode.code}`));

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
  pluginNode: FrontendPluginMetadataNode
): Promise<Plugins> => {
  try {
    // Check if this plugin has already been loaded
    if (!(pluginNode.code in window)) {
      // Initializes the shared scope. Fills it with known provided modules from this build and all remotes
      await __webpack_init_sharing__('default');
      // Fetch the plugin app
      const fetchedContainer = await fetchPlugin(pluginNode);
      // Initialize the plugin app
      await fetchedContainer.init(__webpack_share_scopes__['default']);
    }
    // `container` is the plugin app
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const container = window[pluginNode.code as any] as unknown as Container;
    if (!container)
      throw new Error(`Failed to load plugin: ${pluginNode.code}`);

    // The module passed to get() must match the `exposes` item in our plugin app's webpack.config
    // this is always set as "plugin" in plugin's webpack
    const factory = await container.get('plugin');

    // `Module` is the React Component exported from the plugin
    const Module = factory?.();
    if (!Module?.default)
      throw new Error(`Failed to load plugin: ${pluginNode.code}`);

    return Module.default;
  } catch (e) {
    console.error(e);
    throw new Error('Failed to load plugin');
  }
};
