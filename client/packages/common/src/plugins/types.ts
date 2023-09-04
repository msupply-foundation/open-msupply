export enum PluginArea {
  AppBar,
  DashboardWidget,
  Toolbar,
}

export enum PluginType {
  Dashboard,
  InboundShipment,
  InternalOrder,
  OutboundShipment,
  Requisition,
  Stock,
  Stocktake,
}

/**
 * Plugin interface
 * area: the area of the app which the plugin component will be rendered in
 * data: is context specific data which is passed to the plugin, for example a plugin
 * module: the name of the exposed react component
 * name: the name of the plugin
 * path: file path for the plugin, possibly unnecessary now
 * on the InboundShipment DetailView will have an type of `InvoiceNode`
 * scope: the name of the scope used by webpack module federation
 * type: defines the type of the data to be passed in
 */
export interface Plugin<T> {
  area: PluginArea;
  data?: T;
  module: string;
  name: string;
  path: string;
  type: PluginType;
}

export interface PluginDefinition {
  config: string;
  name: string;
}
