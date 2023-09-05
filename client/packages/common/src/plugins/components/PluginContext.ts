import { createContext } from 'react';
import { Plugin, PluginArea, PluginType } from '../types';
import { RecordWithId } from '../../types/utility';
import { ColumnDefinition } from '../../ui';

export interface PluginState {
  plugins: Plugin<unknown>[];
}

export type PluginComponent = <T>({ data }: { data: T }) => JSX.Element;

export interface PluginControllerState extends PluginState {
  setState: (state: PluginState) => void;
  setPlugins: (plugins: Plugin<unknown>[]) => void;
  getPluginElements: <T extends RecordWithId>({
    area,
    type,
    data,
  }: {
    area: PluginArea;
    type: PluginType;
    data?: T;
  }) => (JSX.Element | null)[];
  getPluginColumns: <T extends RecordWithId>({
    area,
    type,
  }: {
    area: PluginArea;
    type: PluginType;
  }) => Promise<ColumnDefinition<T>[]>;
}

export const PluginContext = createContext<PluginControllerState>({} as never);
