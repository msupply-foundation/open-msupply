import { PluginTypes } from './generated/PluginTypes';

export type BackendPlugins = {
  average_monthly_consumption?: (
    _: PluginTypes['average_monthly_consumption']['input']
  ) => PluginTypes['average_monthly_consumption']['output'];
  transform_request_requisition_lines?: (
    _: PluginTypes['transform_request_requisition_lines']['input']
  ) => PluginTypes['transform_request_requisition_lines']['output'];
};

declare global {
  var sql: (_: string) => [Record<string, any>];
  var log: (_: any) => void;
  var get_store_preferences: (
    _: string
  ) => PluginTypes['get_store_preferences'];
  var get_plugin_data: (
    _: PluginTypes['get_plugin_data']['input']
  ) => PluginTypes['get_plugin_data']['output'];
}
