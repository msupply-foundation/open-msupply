import {
  PreferenceKey,
  PurchaseOrderNodeType,
  useAuthContext,
  useConfirmationModal,
  useNotification,
  usePreference,
  UserPermission,
  useTranslation,
} from '@openmsupply-client/common';
import { usePurchaseOrder } from '../../../api/hooks/usePurchaseOrder';
import { useEffect, useMemo, useState } from 'react';
import {
  getButtonLabel,
  getNextStatusOption,
  getStatusOptions,
  getStatusTranslation,
  PurchaseOrderStatusOption,
} from './utils';

export const useStatusChangeButton = () => {
  const t = useTranslation();
  const { success, error, info } = useNotification();
  const { userHasPermission } = useAuthContext();
  const {
    query: { data },
    update: { update },
  } = usePurchaseOrder();
  const { status, lines } = data ?? {};

  const { data: preferences } = usePreference(
    PreferenceKey.AuthorisePurchaseOrder
  );
  const requiresAuthorisation = preferences?.authorisePurchaseOrder ?? false;

  const options = useMemo(
    () => getStatusOptions(status, getButtonLabel(t), requiresAuthorisation),
    [status, t, requiresAuthorisation]
  );

  const [selectedOption, setSelectedOption] =
    useState<PurchaseOrderStatusOption | null>(() =>
      getNextStatusOption(status, options, requiresAuthorisation)
    );

  const handleConfirm = async () => {
    if (!selectedOption) return null;

    const status = selectedOption.value as PurchaseOrderNodeType | undefined;

    const isAuthorisationBlocked =
      requiresAuthorisation &&
      status === PurchaseOrderNodeType.Authorised &&
      !userHasPermission(UserPermission.PurchaseOrderAuthorise);

    if (isAuthorisationBlocked)
      return info(t('error.no-purchase-order-authorisation-permission'))();

    try {
      await update({ status });
      success(t('messages.purchase-order-saved'))();
    } catch (e) {
      error(t('messages.error-saving-purchase-order'))();
    }
  };

  const getConfirmation = useConfirmationModal({
    title: t('heading.are-you-sure'),
    message: t('messages.confirm-status-as', {
      status: selectedOption?.value
        ? getStatusTranslation(selectedOption?.value)
        : '',
    }),
    onConfirm: handleConfirm,
  });

  useEffect(() => {
    setSelectedOption(
      getNextStatusOption(status, options, requiresAuthorisation)
    );
  }, [status, options, requiresAuthorisation]);

  return {
    lines,
    options,
    getConfirmation,
    selectedOption,
    setSelectedOption,
  };
};
