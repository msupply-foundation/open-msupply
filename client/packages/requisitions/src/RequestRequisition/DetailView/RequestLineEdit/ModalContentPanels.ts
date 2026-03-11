import {
  LocaleKey,
  TypedTFunction,
  ValueInfo,
} from '@openmsupply-client/common';
import { DraftRequestLine } from '.';

export const getLeftPanel = (
  t: TypedTFunction<LocaleKey>,
  draft?: DraftRequestLine | null
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
  ];

  return base;
};

export const getExtraMiddlePanels = (
  t: TypedTFunction<LocaleKey>,
  draft?: DraftRequestLine | null
): ValueInfo[] => {
  return [
    {
      label: t('label.suggested'),
      value: draft?.suggestedQuantity,
      sx: {
        background: theme => theme.palette.background.group.dark,
        pt: 0.5,
        pb: 0.5,
      },
      roundUp: true,
    },
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
      endAdornmentOverride: t('label.days'),
      isDosesEnabled: false,
    },
  ];
};

export const getSuggestedRow = (
  t: TypedTFunction<LocaleKey>,
  draft?: DraftRequestLine | null
): ValueInfo[] => {
  if (!draft) return [];

  return [
    {
      label: t('label.suggested'),
      value: draft.suggestedQuantity,
      sx: {
        pl: 0,
        pt: 0.5,
      },
      roundUp: true,
    },
  ];
};
