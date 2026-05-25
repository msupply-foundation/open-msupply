export type ExamplePluginConfig = {
  enabled: boolean;
  logPrefix: string;
};

export const DEFAULT_EXAMPLE_PLUGIN_CONFIG: ExamplePluginConfig = {
  enabled: true,
  logPrefix: 'Example Plugins',
};
