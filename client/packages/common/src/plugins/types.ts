export enum PluginArea {
  AppBar,
  Toolbar,
}

export enum PluginType {
  InboundShipment,
  InternalOrder,
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
