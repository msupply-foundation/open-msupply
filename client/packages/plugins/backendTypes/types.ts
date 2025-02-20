import { PluginTypes } from './generated/PluginTypes';

export type BackendPlugins = {
  average_monthly_consumption?: (
    _: PluginTypes['average_monthly_consumption']['input']
  ) => PluginTypes['average_monthly_consumption']['output'];
};

declare global {
  var sql: (_: string) => [Record<string, any>];
  var log: (_: any) => void;
}
