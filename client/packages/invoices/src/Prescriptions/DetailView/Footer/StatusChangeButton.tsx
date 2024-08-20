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
} from '@openmsupply-client/common';
import {
  getNextPrescriptionStatus,
  getStatusTranslation,
} from '../../../utils';
import { usePrescription } from '../../api';

const getStatusOptions = (
  currentStatus: InvoiceNodeStatus,
  getButtonLabel: (status: InvoiceNodeStatus) => string
): SplitButtonOption<InvoiceNodeStatus>[] => {
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
  status: InvoiceNodeStatus,
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
  const { status, update, lines } = usePrescription.document.fields([
    'status',
    'lines',
  ]);
  const { success, error } = useNotification();
  const t = useTranslation('dispensary');
  const { data } = usePrescription.document.get();
  const hasLinesToPrune =
    data?.status !== InvoiceNodeStatus.Verified &&
    (data?.lines?.nodes ?? []).some(line => line.numberOfPacks === 0);

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
    lines,
  };
};

export const StatusChangeButton = () => {
  const { options, selectedOption, setSelectedOption, getConfirmation, lines } =
    useStatusChangeButton();
  const isDisabled = usePrescription.utils.isDisabled();
  const t = useTranslation();
  const noLines =
    lines?.totalCount === 0 ||
    lines?.nodes?.every(l => l.type === InvoiceLineNodeType.UnallocatedStock);

  if (!selectedOption) return null;
  if (isDisabled) return null;

  const onStatusClick = () => {
    return getConfirmation();
  };

  return (
    <SplitButton
      label={noLines ? t('messages.no-lines') : ''}
      options={options}
      selectedOption={selectedOption}
      onSelectOption={setSelectedOption}
      Icon={<ArrowRightIcon />}
      onClick={onStatusClick}
    />
  );
};
