import { PluginTypes } from './generated/PluginTypes';

export type ArrayElement<T> = T extends (infer U)[] ? U : T;

export type BackendPlugins = {
  average_monthly_consumption?: (
    _: PluginTypes['average_monthly_consumption']['input']
  ) => PluginTypes['average_monthly_consumption']['output'];
  transform_request_requisition_lines?: (
    _: PluginTypes['transform_request_requisition_lines']['input']
  ) => PluginTypes['transform_request_requisition_lines']['output'];
  get_consumption?: (
    _: PluginTypes['get_consumption']['input']
  ) => PluginTypes['get_consumption']['output'];
  graphql_query?: (
    _: PluginTypes['graphql_query']['input']
  ) => PluginTypes['graphql_query']['output'];
  processor?: (
    _: PluginTypes['processor']['input']
  ) => PluginTypes['processor']['output'];
};

declare global {
  var sql: (_: string) => [Record<string, any>];
  var sql_type: () => 'postgres' | 'sqlite';
  var log: (_: any) => void;
  var get_store_preferences: (
    _: string
  ) => PluginTypes['get_store_preferences'];
  var get_plugin_data: (
    _: PluginTypes['get_plugin_data']['input']
  ) => PluginTypes['get_plugin_data']['output'];
  var use_repository: (
    _: PluginTypes['use_repository']['input']
  ) => PluginTypes['use_repository']['output'];
  var use_graphql: (
    _: PluginTypes['use_graphql']['input']
  ) => PluginTypes['use_graphql']['output'];
  var get_active_stores_on_site: () => PluginTypes['get_active_stores_on_site']['output'];
}
