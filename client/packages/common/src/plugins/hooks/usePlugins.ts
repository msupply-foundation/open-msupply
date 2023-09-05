import { useContext } from 'react';
import { PluginArea, PluginType } from '../types';
import { PluginContext } from '../components/PluginContext';

export const usePlugins = ({
  area,
  type,
}: {
  area: PluginArea;
  type: PluginType;
}) => {
  const { plugins } = useContext(PluginContext);

  return plugins.filter(plugin => plugin.area === area && plugin.type === type);
};
