import React, { useMemo, useState, useEffect } from 'react';
import {
  ArrowRightIcon,
  useTranslation,
  useNotification,
  InvoiceNodeStatus,
  SplitButton,
  SplitButtonOption,
  useConfirmationModal,
  InvoiceLineNodeType,
  useDisabledNotificationToast,
  useEditModal,
} from '@openmsupply-client/common';
import {
  getNextPrescriptionStatus,
  getStatusTranslation,
} from '../../../utils';
import { usePrescription } from '../../api';
import { PaymentsModal } from '../Payments';
import { Draft } from '../../..';

const getStatusOptions = (
  currentStatus: InvoiceNodeStatus | undefined,
  getButtonLabel: (status: InvoiceNodeStatus) => string
): SplitButtonOption<InvoiceNodeStatus>[] => {
  if (!currentStatus) return [];
  const options: [
    SplitButtonOption<InvoiceNodeStatus>,
    SplitButtonOption<InvoiceNodeStatus>,
    SplitButtonOption<InvoiceNodeStatus>,
  ] = [
    {
      value: InvoiceNodeStatus.New,
      label: getButtonLabel(InvoiceNodeStatus.New),
      isDisabled: true,
    },
    {
      value: InvoiceNodeStatus.Picked,
      label: getButtonLabel(InvoiceNodeStatus.Picked),
      isDisabled: true,
    },
    {
      value: InvoiceNodeStatus.Verified,
      label: getButtonLabel(InvoiceNodeStatus.Verified),
      isDisabled: true,
    },
  ];

  if (currentStatus === InvoiceNodeStatus.New) {
    options[1].isDisabled = false;
    options[2].isDisabled = false;
  }

  if (currentStatus === InvoiceNodeStatus.Picked) {
    options[2].isDisabled = false;
  }

  return options;
};

const getNextStatusOption = (
  status: InvoiceNodeStatus | undefined,
  options: SplitButtonOption<InvoiceNodeStatus>[]
): SplitButtonOption<InvoiceNodeStatus> | null => {
  if (!status) return options[0] ?? null;

  const nextStatus = getNextPrescriptionStatus(status);
  const nextStatusOption = options.find(o => o.value === nextStatus);
  return nextStatusOption || null;
};

const getButtonLabel =
  (t: ReturnType<typeof useTranslation>) =>
  (invoiceStatus: InvoiceNodeStatus): string => {
    return t('button.save-and-confirm-status', {
      status: t(getStatusTranslation(invoiceStatus)),
    });
  };

const useStatusChangeButton = () => {
  const t = useTranslation();
  const { success, error } = useNotification();
  const {
    query: { data },
    update: { update },
    isDisabled,
  } = usePrescription();

  const { status, lines } = data ?? {};

  const hasLinesToPrune =
    data?.status !== InvoiceNodeStatus.Verified &&
    (data?.lines?.nodes ?? []).some(line => line.numberOfPacks === 0);

  const showPaymentWindow =
    lines != null &&
    lines.nodes.filter(({ totalAfterTax }) => totalAfterTax > 0).length > 0;

  const isEmptyLines =
    lines?.totalCount === 0 ||
    lines?.nodes?.every(
      line => line.type === InvoiceLineNodeType.UnallocatedStock
    );

  const options = useMemo(
    () => getStatusOptions(status, getButtonLabel(t)),
    [status, getButtonLabel]
  );

  const [selectedOption, setSelectedOption] =
    useState<SplitButtonOption<InvoiceNodeStatus> | null>(() =>
      getNextStatusOption(status, options)
    );

  const onConfirmStatusChange = async () => {
    if (!selectedOption) return null;
    try {
      await update({ status: selectedOption.value });
      success(t('messages.prescription-saved'))();
    } catch (e) {
      error(t('messages.error-saving-prescription'))();
    }
  };

  const getConfirmation = useConfirmationModal({
    title: t('heading.are-you-sure'),
    message: hasLinesToPrune
      ? t('messages.confirm-zero-quantity-status')
      : t('messages.confirm-status-as', {
          status: selectedOption?.value
            ? getStatusTranslation(selectedOption?.value)
            : '',
        }),
    onConfirm: onConfirmStatusChange,
  });

  useEffect(() => {
    setSelectedOption(() => getNextStatusOption(status, options));
  }, [status, options]);

  return {
    options,
    selectedOption,
    setSelectedOption,
    getConfirmation,
    isEmptyLines,
    isDisabled,
    showPaymentWindow,
  };
};

export const StatusChangeButton = () => {
  const t = useTranslation();
  const { onOpen, onClose, isOpen } = useEditModal<Draft>();

  const {
    options,
    selectedOption,
    setSelectedOption,
    getConfirmation,
    isEmptyLines,
    isDisabled,
    showPaymentWindow,
  } = useStatusChangeButton();

  const emptyLinesNotifications = useDisabledNotificationToast(
    t('messages.no-lines')
  );

  const onStatusClick = () => {
    if (isEmptyLines) return emptyLinesNotifications();
    if (showPaymentWindow) return onOpen();
    return getConfirmation();
  };

  if (!selectedOption) return null;
  if (isDisabled) return null;

  return (
    <>
      <SplitButton
        label={isEmptyLines ? t('messages.no-lines') : ''}
        options={options}
        selectedOption={selectedOption}
        onSelectOption={setSelectedOption}
        Icon={<ArrowRightIcon />}
        onClick={onStatusClick}
      />
      <PaymentsModal isOpen={isOpen} onClose={onClose} />
    </>
  );
};
