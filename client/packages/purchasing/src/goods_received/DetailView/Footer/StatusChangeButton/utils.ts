import {
  LocaleKey,
  GoodsReceivedNodeStatus,
  SplitButtonOption,
  TypedTFunction,
} from '@openmsupply-client/common';

export type GoodsReceivedStatusOption =
  SplitButtonOption<GoodsReceivedNodeStatus>;

export const getStatusOptions = (
  currentStatus: GoodsReceivedNodeStatus | undefined,
  t: TypedTFunction<LocaleKey>
): GoodsReceivedStatusOption[] => {
  if (currentStatus !== GoodsReceivedNodeStatus.New) return [];

  return [
    {
      value: GoodsReceivedNodeStatus.Finalised,
      label: t('button.save-and-confirm-status', {
        status: t('label.finalised'),
      }),
      isDisabled: false,
    },
  ];
};

export const getNextStatusOption = (
  status: GoodsReceivedNodeStatus | undefined,
  options: GoodsReceivedStatusOption[]
): GoodsReceivedStatusOption | null => {
  return status === GoodsReceivedNodeStatus.New ? (options[0] ?? null) : null;
};
