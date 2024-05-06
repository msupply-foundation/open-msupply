import { TemperatureBreachNodeType } from '@common/types';

export interface PopoverVirtualElement {
  getBoundingClientRect: () => DOMRect;
  nodeType: Node['ELEMENT_NODE'];
}

export interface DataPoint {
  datetime: Date | null;
  temperature: number | null;
  breachId?: string;
}

export interface ChartSeries {
  id: string;
  name: string;
  colour: string;
  data: DataPoint[];
}

export interface Breach {
  anchor: PopoverVirtualElement | null;
  date: Date;
  sensorId: string;
  type: TemperatureBreachNodeType;
  breachId: string;
  endDateTime: Date | null;
  startDateTime: Date;
}

export interface DotProps {
  cx: number;
  cy: number;
  payload: DataPoint;
}

export type BreachDot = {
  position: DOMRect;
  breachId: string;
};
