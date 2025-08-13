import {
  GoodsReceivedNodeStatus,
  useConfirmationModal,
  useNotification,
  useTranslation,
} from '@openmsupply-client/common';
import { useGoodsReceived } from '../../../api/hooks/useGoodsReceived';
import { useEffect, useMemo, useState } from 'react';
import {
  getStatusOptions,
  getNextStatusOption,
  GoodsReceivedStatusOption,
} from './utils';

export const useStatusChangeButton = () => {
  const t = useTranslation();
  const { success, error } = useNotification();
  const {
    query: { data },
    update: { update },
  } = useGoodsReceived();
  const { status } = data ?? {};

  const options = useMemo(() => getStatusOptions(status, t), [status, t]);

  const [selectedOption, setSelectedOption] =
    useState<GoodsReceivedStatusOption | null>(() =>
      getNextStatusOption(status, options)
    );

  const handleConfirm = async () => {
    if (!selectedOption || !data?.id) return null;

    // Since we only have New -> Finalised, we know the status is always Finalised
    try {
      await update({ status: GoodsReceivedNodeStatus.Finalised });
      success(t('messages.purchase-order-saved'))();
    } catch (e) {
      error(t('messages.error-saving-purchase-order'))();
    }
  };

  const getConfirmation = useConfirmationModal({
    title: t('heading.are-you-sure'),
    message: t('messages.confirm-status-as', {
      status:
        selectedOption?.value === GoodsReceivedNodeStatus.Finalised
          ? t('label.finalised')
          : '',
    }),
    onConfirm: handleConfirm,
  });

  useEffect(() => {
    setSelectedOption(getNextStatusOption(status, options));
  }, [status, options]);

  return {
    options,
    getConfirmation,
    selectedOption,
    setSelectedOption,
  };
};
