import {
  ColumnPlugin,
  ComponentPlugin,
  create,
  ArrayUtils,
} from '@openmsupply-client/common';

type PluginProvider = {
  columnPlugins: ColumnPlugin[];
  componentPlugins: ComponentPlugin[];
  addColumnPlugin: (plugin: ColumnPlugin) => void;
  updateColumnPlugin: (plugin: ColumnPlugin) => void;
  addComponentPlugin: (plugin: ComponentPlugin) => void;
  getComponentPlugins: <T extends ComponentPlugin['type']>(
    type: T
  ) => Extract<ComponentPlugin, { type: T }>[];
  getColumnPlugins: <T extends ColumnPlugin['type']>(
    type: T
  ) => Extract<ColumnPlugin, { type: T }>[];
};

export const usePluginProvider = create<PluginProvider>((set, get) => {
  return {
    columnPlugins: [],
    componentPlugins: [],
    addColumnPlugin: (plugin: ColumnPlugin) =>
      set(({ columnPlugins }) => ({
        columnPlugins: ArrayUtils.uniqBy([...columnPlugins, plugin], 'name'),
      })),
    addComponentPlugin: (plugin: ComponentPlugin) =>
      set(({ componentPlugins }) => ({
        componentPlugins: ArrayUtils.uniqBy(
          [...componentPlugins, plugin],
          'name'
        ),
      })),
    updateColumnPlugin: (plugin: ColumnPlugin) =>
      set(({ columnPlugins }) => {
        const current = columnPlugins.find(p => p.name === plugin.name);
        if (!current) return { columnPlugins };
        return {
          columnPlugins: [
            ...columnPlugins.filter(p => p.name !== plugin.name),
            plugin,
          ],
        };
      }),
    getColumnPlugins: <T extends ColumnPlugin['type']>(type: T) => {
      const columnPlugins = get().columnPlugins;
      return columnPlugins.filter(
        (plugin): plugin is Extract<ColumnPlugin, { type: T }> =>
          plugin.type === type
      );
    },
    getComponentPlugins: <T extends ComponentPlugin['type']>(type: T) => {
      const plugins = get().componentPlugins;
      return plugins.filter(
        (plugin): plugin is Extract<ComponentPlugin, { type: T }> =>
          plugin.type === type
      );
    },
  };
});
