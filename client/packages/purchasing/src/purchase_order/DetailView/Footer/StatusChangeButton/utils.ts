import {
  LocaleKey,
  PurchaseOrderNodeStatus,
  SplitButtonOption,
  TypedTFunction,
} from '@openmsupply-client/common';
import { purchaseOrderStatuses, statusTranslation } from '../utils';

export type PurchaseOrderStatusOption =
  SplitButtonOption<PurchaseOrderNodeStatus>;

export const getStatusOptions = (
  currentStatus: PurchaseOrderNodeStatus | undefined,
  getButtonLabel: (status: PurchaseOrderNodeStatus) => string
): PurchaseOrderStatusOption[] => {
  if (!currentStatus) return [];

  const options: [
    PurchaseOrderStatusOption,
    PurchaseOrderStatusOption,
    PurchaseOrderStatusOption,
    PurchaseOrderStatusOption,
  ] = [
    {
      value: PurchaseOrderNodeStatus.New,
      label: getButtonLabel(PurchaseOrderNodeStatus.New),
      isDisabled: true,
    },
    // TODO: Authorised should only be considered if pref is on?
    {
      value: PurchaseOrderNodeStatus.Authorised,
      label: getButtonLabel(PurchaseOrderNodeStatus.Authorised),
      isDisabled: true,
    },
    {
      value: PurchaseOrderNodeStatus.Confirmed,
      label: getButtonLabel(PurchaseOrderNodeStatus.Confirmed),
      isDisabled: true,
    },
    {
      value: PurchaseOrderNodeStatus.Finalised,
      label: getButtonLabel(PurchaseOrderNodeStatus.Finalised),
      isDisabled: true,
    },
  ];

  if (currentStatus === PurchaseOrderNodeStatus.New) {
    options[1].isDisabled = false;
    options[2].isDisabled = false;
  }

  if (currentStatus === PurchaseOrderNodeStatus.Authorised) {
    options[2].isDisabled = false;
    options[3].isDisabled = false;
  }

  if (currentStatus === PurchaseOrderNodeStatus.Confirmed) {
    options[3].isDisabled = false;
  }

  return options;
};

export const getNextStatusOption = (
  status: PurchaseOrderNodeStatus | undefined,
  options: PurchaseOrderStatusOption[]
): PurchaseOrderStatusOption | null => {
  if (!status) return options[0] ?? null;

  const currentIndex = purchaseOrderStatuses.findIndex(
    currentStatus => currentStatus === status
  );
  const nextStatus = purchaseOrderStatuses[currentIndex + 1];
  const nextStatusOption = options.find(o => o.value === nextStatus);
  return nextStatusOption || null;
};

export const getButtonLabel =
  (t: TypedTFunction<LocaleKey>) =>
  (purchaseOrderStatus: PurchaseOrderNodeStatus): string =>
    t('button.save-and-confirm-status', {
      status: t(getStatusTranslation(purchaseOrderStatus)),
    });

export const getStatusTranslation = (
  status: PurchaseOrderNodeStatus
): LocaleKey => statusTranslation[status];
