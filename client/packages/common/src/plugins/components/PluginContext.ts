import { createContext } from 'react';
import { Plugin, PluginArea, PluginType } from '../types';
import { RecordWithId } from '../../types/utility';

export interface PluginState {
  plugins: Plugin<unknown>[];
}

export type PluginComponent = <T>({ data }: { data: T }) => JSX.Element;

export interface PluginControllerState extends PluginState {
  setState: (state: PluginState) => void;
  setPlugins: (plugins: Plugin<unknown>[]) => void;
  getPlugins: (area: PluginArea, type: PluginType) => Plugin<unknown>[];
  getPluginElements: <T extends RecordWithId>({
    area,
    type,
    data,
  }: {
    area: PluginArea;
    type: PluginType;
    data?: T;
  }) => (JSX.Element | null)[];
}

export const PluginContext = createContext<PluginControllerState>({} as never);
