import {
  ColumnPlugin,
  ComponentPlugin,
  create,
  ArrayUtils,
  EventType,
} from '@openmsupply-client/common';

export type PluginEventListener = {
  eventType: EventType;
  listener: EventListener;
};

type PluginProvider = {
  addColumnPlugin: (plugin: ColumnPlugin) => void;
  addComponentPlugin: (plugin: ComponentPlugin) => void;
  addEventListener: (listener: PluginEventListener) => void;
  columnPlugins: ColumnPlugin[];
  componentPlugins: ComponentPlugin[];
  dispatchEvent: (eventType: EventType, event: Event) => void;
  eventListeners: PluginEventListener[];
  getComponentPlugins: <T extends ComponentPlugin['type']>(
    type: T
  ) => Extract<ComponentPlugin, { type: T }>[];
  getColumnPlugins: <T extends ColumnPlugin['type']>(
    type: T
  ) => Extract<ColumnPlugin, { type: T }>[];
  removeEventListener: (listener: PluginEventListener) => void;
};

export const usePluginProvider = create<PluginProvider>((set, get) => ({
  columnPlugins: [],
  componentPlugins: [],
  eventListeners: [],
  addColumnPlugin: (plugin: ColumnPlugin) =>
    set(({ columnPlugins }) => ({
      columnPlugins: ArrayUtils.uniqBy([...columnPlugins, plugin], 'module'),
    })),
  addComponentPlugin: (plugin: ComponentPlugin) =>
    set(({ componentPlugins }) => ({
      componentPlugins: ArrayUtils.uniqBy(
        [...componentPlugins, plugin],
        'module'
      ),
    })),
  addEventListener: (listener: PluginEventListener) =>
    set(({ eventListeners }) => ({
      eventListeners: [...eventListeners, listener],
    })),
  dispatchEvent: (eventType: EventType, event: Event) => {
    // console.debug(`*** dispatching event ${eventType} ***`);
    get()
      .eventListeners.filter(listener => listener.eventType === eventType)
      .forEach(listener => listener.listener(event));
  },
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
  removeEventListener: ({ eventType, listener }) =>
    set(({ eventListeners }) => ({
      eventListeners: eventListeners.filter(
        l => !(l.eventType === eventType && l.listener === listener)
      ),
    })),
}));
