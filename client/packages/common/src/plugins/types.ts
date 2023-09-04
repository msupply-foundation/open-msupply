export enum PluginArea {
  AppBar,
  Column,
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
