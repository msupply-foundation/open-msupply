import { AlertColor } from '@common/components';

export * from './AutoAllocationAlerts';
export * from './AllocateInSelector';
export * from './AutoAllocateIssueField';

export type StockOutAlert = {
  severity: AlertColor;
  message: string;
};
