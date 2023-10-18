import { AlertColor } from '@common/components';

export * from './StockOutAlerts';

export type StockOutAlert = {
  severity: AlertColor;
  message: string;
};
