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

export interface DotProps {
  cx: number;
  cy: number;
  stroke?: string;
  payload: DataPoint;
  fill?: string;
  r: number;
  strokeWidth?: number;
}

export type BreachDot = {
  position: DOMRect;
  breachId: string;
};
