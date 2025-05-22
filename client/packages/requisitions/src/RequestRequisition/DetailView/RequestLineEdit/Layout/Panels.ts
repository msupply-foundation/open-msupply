import {
  SxProps,
  Theme,
  LocaleKey,
  TypedTFunction,
} from '@openmsupply-client/common';
import { DraftRequestLine } from '../hooks';

export type ValueInfo = {
  label: string;
  value?: number | null;
  sx?: SxProps<Theme>;
};

export const getLeftPanel = (
  t: TypedTFunction<LocaleKey>,
  draft?: DraftRequestLine | null,
  showExtraFields: boolean = false
): ValueInfo[] => {
  const base: ValueInfo[] = [
    {
      label: t('label.our-soh'),
      value: draft?.itemStats.availableStockOnHand,
    },
    {
      label: t('label.amc/amd'),
      value: draft?.itemStats.averageMonthlyConsumption,
    },
    {
      label: t('label.months-of-stock'),
      value: draft?.itemStats.availableMonthsOfStockOnHand,
    },
  ];

  const extraPanel: ValueInfo[] = [
    {
      label: t('label.short-expiry'),
      value: draft?.expiringUnits,
    },
  ];

  return showExtraFields ? [...base, ...extraPanel] : base;
};

export const getMiddlePanel = (
  t: TypedTFunction<LocaleKey>,
  draft?: DraftRequestLine | null,
  showExtraFields: boolean = false
): ValueInfo[] => {
  const base: ValueInfo[] = [
    {
      label: t('label.suggested'),
      value: draft?.suggestedQuantity,
      sx: { background: theme => theme.palette.background.group },
    },
  ];

  const extra: ValueInfo[] = [
    {
      label: t('label.incoming-stock'),
      value: draft?.incomingUnits,
    },
    {
      label: t('label.outgoing'),
      value: draft?.outgoingUnits,
    },
    {
      label: t('label.losses'),
      value: draft?.lossInUnits,
    },
    {
      label: t('label.additions'),
      value: draft?.additionInUnits,
    },
    {
      label: t('label.days-out-of-stock'),
      value: draft?.daysOutOfStock,
    },
  ];

  return showExtraFields ? [...base, ...extra] : base;
};
