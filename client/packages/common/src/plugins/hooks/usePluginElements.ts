import { useContext } from 'react';
import { PluginArea, PluginType } from '../types';
import { PluginContext } from '../components/PluginContext';
import { RecordWithId } from '../../types/utility';

export function usePluginElements<T extends RecordWithId>({
  area,
  type,
  data,
}: {
  area: PluginArea;
  type: PluginType;
  data?: T;
}) {
  const { getPluginElements } = useContext(PluginContext);

  return getPluginElements({ area, type, data });
}
