import {
  LocaleKey,
  GoodsReceivedNodeStatus,
  TypedTFunction,
} from '@openmsupply-client/common';

// TODO: extend back end to support authorise and finalised date
export const goodsReceivedStatuses: GoodsReceivedNodeStatus[] = [
  GoodsReceivedNodeStatus.New,
  GoodsReceivedNodeStatus.Finalised,
];

export const statusTranslation: Record<GoodsReceivedNodeStatus, LocaleKey> = {
  NEW: 'label.new',
  FINALISED: 'label.finalised',
};

export const getStatusTranslator =
  (t: TypedTFunction<LocaleKey>) =>
  (status: GoodsReceivedNodeStatus): string =>
    t(
      statusTranslation[status] ??
        statusTranslation[GoodsReceivedNodeStatus.New]
    );
