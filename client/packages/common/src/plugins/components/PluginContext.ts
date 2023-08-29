import { createContext } from 'react';
import { Plugin, PluginArea, PluginType } from '../types';

export interface PluginState {
  plugins: Plugin<unknown>[];
}

export type PluginComponent  = <T>({data}:{data:T}) => JSX.Element;

export interface PluginControllerState extends PluginState {
  setState: (state: PluginState) => void;
  setPlugins: (plugins: Plugin<unknown>[]) => void;
  getPlugins: (area: PluginArea, type: PluginType) => Plugin<unknown>[];
  getPluginElements: ({
    area,
    type,
    data,
  }: {
    area: PluginArea;
    type: PluginType;
    data: unknown;
  }) => (JSX.Element | null)[];
}

export const PluginContext = createContext<PluginControllerState>({} as never);
