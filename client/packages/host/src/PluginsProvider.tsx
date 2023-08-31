import React, { PropsWithChildren } from 'react';
import {
  Plugin,
  PluginProvider,
  PluginArea,
  PluginType,
  PluginNode,
} from '@openmsupply-client/common';
import { useHost } from './api';

const getPluginArea = (area: string) => {
  switch (area) {
    case 'Toolbar':
      return PluginArea.Toolbar;
    case 'AppBar':
      return PluginArea.AppBar;
    case 'Dashboard':
      return PluginArea.Dashboard;
    default:
      throw new Error(`Unknown plugin area ${area}`);
  }
};

const getPluginType = (type: string) => {
  switch (type) {
    case 'InboundShipment':
      return PluginType.InboundShipment;
    case 'None':
      return PluginType.None;
    default:
      throw new Error(`Unknown plugin type ${type}`);
  }
};

interface PluginComponents {
  area: string;
  type: string;
  module: string;
}

interface PluginDependencies {
  omSupplyVersion: string;
}

interface PluginConfig {
  name: string;
  version: string;
  components: PluginComponents[];
  dependencies: PluginDependencies;
}

const mapPlugin = (plugin: PluginNode): Plugin<unknown>[] | null => {
  const { config, path } = plugin;
  try {
    const elements: Plugin<unknown>[] = [];
    const pluginConfig = JSON.parse(config) as PluginConfig;
    pluginConfig.components.forEach(component => {
      const { area, type, module } = component;
      elements.push({
        area: getPluginArea(area),
        module,
        name: pluginConfig.name,
        type: getPluginType(type),
        path,
      });
    });
    return elements;
  } catch (e) {
    console.error(`Failed to parse plugin config for plugin ${path}`);
  }
  return null;
};

const mapPlugins = (plugins?: PluginNode[]) => {
  const result: Plugin<unknown>[] = [];
  if (!plugins) return result;

  plugins.forEach(plugin => {
    const mapped = mapPlugin(plugin);
    if (mapped !== null) result.push(...mapped);
  });
  return result;
};

export const PluginsProvider: React.FC<PropsWithChildren> = ({ children }) => {
  const { data } = useHost.plugins.list();

  return <PluginProvider plugins={mapPlugins(data)}>{children}</PluginProvider>;
};
