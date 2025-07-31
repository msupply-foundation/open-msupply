import {
  PurchaseOrderNodeType,
  useConfirmationModal,
  useNotification,
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
  const { success, error } = useNotification();
  const {
    query: { data },
    update: { update },
  } = usePurchaseOrder();

  const { status, lines } = data ?? {};

  const options = useMemo(
    () => getStatusOptions(status, getButtonLabel(t)),
    [status, t]
  );

  const [selectedOption, setSelectedOption] =
    useState<PurchaseOrderStatusOption | null>(() =>
      getNextStatusOption(status, options)
    );

  const handleConfirm = async () => {
    if (!selectedOption) return null;
    try {
      const status = selectedOption.value as PurchaseOrderNodeType | undefined;
      await update({ status });
      success(t('messages.purchase-order-saved'))();
    } catch (e) {
      error(t('messages.error-saving-purchase-order'))();
    }
  };

  const getConfirmation = useConfirmationModal({
    title: t('heading.are-you-sure'),
    message: t('messages.confirm-purchase-order-status-as', {
      status: selectedOption?.value
        ? getStatusTranslation(selectedOption?.value)
        : '',
    }),
    onConfirm: handleConfirm,
  });

  useEffect(() => {
    setSelectedOption(getNextStatusOption(status, options));
  }, [status, options]);

  return {
    lines,
    options,
    getConfirmation,
    selectedOption,
    setSelectedOption,
  };
};
