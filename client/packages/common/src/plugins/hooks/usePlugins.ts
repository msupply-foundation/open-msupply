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
  const { getPlugins } = useContext(PluginContext);

  return getPlugins(area, type);
};
