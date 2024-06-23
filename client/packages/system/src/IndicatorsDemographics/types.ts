export interface Row {
  isNew: boolean;
  id: string;
  percentage: number;
  name: string | undefined;
  baseYear: number;
  basePopulation: number;
  0: number;
  1: number;
  2: number;
  3: number;
  4: number;
  5: number;
}

export interface HeaderValue {
  id: string;
  value: number;
}

export type HeaderData = {
  id: string;
  baseYear: number;
  1: HeaderValue;
  2: HeaderValue;
  3: HeaderValue;
  4: HeaderValue;
  5: HeaderValue;
};
