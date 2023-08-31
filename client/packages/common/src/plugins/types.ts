export enum PluginArea {
  AppBar,
  Dashboard,
  Toolbar,
}

export enum PluginType {
  InboundShipment,
  InternalOrder,
  None,
  OutboundShipment,
  Requisition,
  Stocktake,
}

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
