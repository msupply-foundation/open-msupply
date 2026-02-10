import {
  LocaleKey,
  TypedTFunction,
  ValueInfo,
} from '@openmsupply-client/common';
import { DraftRequestLine } from '.';

export const getLeftPanel = (
  t: TypedTFunction<LocaleKey>,
  draft?: DraftRequestLine | null,
  showExtraFields: boolean = false,
  displayForecasting: boolean = false
): ValueInfo[] => {
  const rows: ValueInfo[] = [
    {
      label: t('label.our-soh'),
      value: draft?.itemStats.availableStockOnHand,
    },
    ...(displayForecasting
      ? [
          {
            label: t('label.target-stock-population'),
            value: draft?.forecastTotalUnits
              ? Math.ceil(draft.forecastTotalUnits)
              : undefined,
          },
        ]
      : [
          {
            label: t('label.amc/amd'),
            value: draft?.itemStats.averageMonthlyConsumption,
          },
        ]),
    {
      label: t('label.months-of-stock'),
      value: draft?.itemStats.availableMonthsOfStockOnHand,
      endAdornmentOverride: t('label.months'),
      displayVaccinesInDoses: false,
    },
    ...(showExtraFields
      ? [
          {
            label: t('label.short-expiry'),
            value: draft?.expiringUnits,
          },
        ]
      : []),
  ];

  return rows;
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
      displayVaccinesInDoses: false,
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
