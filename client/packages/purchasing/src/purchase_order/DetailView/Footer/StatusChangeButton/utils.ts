import {
  LocaleKey,
  PurchaseOrderNodeStatus,
  SplitButtonOption,
  TypedTFunction,
} from '@openmsupply-client/common';
import { purchaseOrderStatuses, statusTranslation } from '../utils';

export type PurchaseOrderStatusOption =
  SplitButtonOption<PurchaseOrderNodeStatus>;

export const enableNextOptions = (
  options: PurchaseOrderStatusOption[],
  currentStatus: PurchaseOrderNodeStatus,
  requiresAuthorisation: boolean
): void => {
  const enableStatusOption = (status: PurchaseOrderNodeStatus) => {
    const option = options.find(option => option.value === status);
    if (option) option.isDisabled = false;
  };

  switch (currentStatus) {
    case PurchaseOrderNodeStatus.New:
      if (requiresAuthorisation)
        enableStatusOption(PurchaseOrderNodeStatus.RequestApproval);
      else enableStatusOption(PurchaseOrderNodeStatus.Confirmed);
      break;
    case PurchaseOrderNodeStatus.RequestApproval:
      enableStatusOption(PurchaseOrderNodeStatus.Confirmed);
      break;
    case PurchaseOrderNodeStatus.Confirmed:
      enableStatusOption(PurchaseOrderNodeStatus.Sent);
      break;
    case PurchaseOrderNodeStatus.Sent:
      enableStatusOption(PurchaseOrderNodeStatus.Finalised);
      break;
  }
};

export const getStatusOptions = (
  currentStatus: PurchaseOrderNodeStatus | undefined,
  getButtonLabel: (status: PurchaseOrderNodeStatus) => string,
  requiresAuthorisation: boolean
): PurchaseOrderStatusOption[] => {
  if (!currentStatus) return [];

  const options: PurchaseOrderStatusOption[] = [
    {
      value: PurchaseOrderNodeStatus.New,
      label: getButtonLabel(PurchaseOrderNodeStatus.New),
      isDisabled: true,
    },
    ...(requiresAuthorisation
      ? [
          {
            value: PurchaseOrderNodeStatus.RequestApproval,
            label: getButtonLabel(PurchaseOrderNodeStatus.RequestApproval),
            isDisabled: true,
          },
        ]
      : []),
    {
      value: PurchaseOrderNodeStatus.Confirmed,
      label: getButtonLabel(PurchaseOrderNodeStatus.Confirmed),
      isDisabled: true,
    },
    {
      value: PurchaseOrderNodeStatus.Sent,
      label: getButtonLabel(PurchaseOrderNodeStatus.Sent),
      isDisabled: true,
    },
    {
      value: PurchaseOrderNodeStatus.Finalised,
      label: getButtonLabel(PurchaseOrderNodeStatus.Finalised),
      isDisabled: true,
    },
  ];

  enableNextOptions(options, currentStatus, requiresAuthorisation);

  return options;
};

export const getNextStatusOption = (
  status: PurchaseOrderNodeStatus | undefined,
  options: PurchaseOrderStatusOption[],
  requiresAuthorisation: boolean
): PurchaseOrderStatusOption | null => {
  if (!status) return options[0] ?? null;

  // Handles case where status is Authorised but requiresAuthorisation is false (got turned off)
  if (
    status === PurchaseOrderNodeStatus.RequestApproval &&
    !requiresAuthorisation
  ) {
    return (
      options.find(
        option => option.value === PurchaseOrderNodeStatus.Confirmed
      ) || null
    );
  }

  const filteredStatuses = requiresAuthorisation
    ? purchaseOrderStatuses
    : purchaseOrderStatuses.filter(
        status => status !== PurchaseOrderNodeStatus.RequestApproval
      );

  const nextStatus = filteredStatuses[filteredStatuses.indexOf(status) + 1];
  return options.find(option => option.value === nextStatus) || null;
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
