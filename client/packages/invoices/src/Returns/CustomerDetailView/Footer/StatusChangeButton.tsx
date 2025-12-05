import React, { useMemo, useState, useEffect } from 'react';
import {
  ArrowRightIcon,
  useTranslation,
  useNotification,
  InvoiceNodeStatus,
  SplitButton,
  SplitButtonOption,
  useConfirmationModal,
  usePreferences,
} from '@openmsupply-client/common';
import {
  customerReturnStatuses,
  getButtonLabel,
  getNextStatusOption,
  getPreviousStatus,
  getStatusTranslation,
  isInboundStatusChangeDisabled,
} from '../../../utils';
import { useReturns } from '../../api';

const getStatusOptions = (
  currentStatus: InvoiceNodeStatus,
  getButtonLabel: (status: InvoiceNodeStatus) => string,
  isManuallyCreated: boolean
): SplitButtonOption<InvoiceNodeStatus>[] => {
  const statuses = isManuallyCreated
    ? [
        InvoiceNodeStatus.New,
        InvoiceNodeStatus.Received,
        InvoiceNodeStatus.Verified,
      ]
    : [
        InvoiceNodeStatus.New,
        InvoiceNodeStatus.Picked,
        InvoiceNodeStatus.Shipped,
        InvoiceNodeStatus.Received,
        InvoiceNodeStatus.Verified,
      ];

  const options = statuses.map(status => ({
    value: status,
    label: getButtonLabel(status),
    isDisabled: true,
  }));

  if (isManuallyCreated) {
    if (currentStatus === InvoiceNodeStatus.New) {
      if (options[1]) options[1].isDisabled = false;
      if (options[2]) options[2].isDisabled = false;
    }
    if (currentStatus === InvoiceNodeStatus.Received) {
      if (options[2]) options[2].isDisabled = false;
    }
  } else {
    if (currentStatus === InvoiceNodeStatus.Shipped) {
      // When shipped, can change to delivered or verified
      if (options[3]) options[3].isDisabled = false;
      if (options[4]) options[4].isDisabled = false;
    }
    if (currentStatus === InvoiceNodeStatus.Received) {
      // When received, can change to verified
      if (options[4]) options[4].isDisabled = false;
    }
  }

  return options;
};

const useStatusChangeButton = () => {
  const t = useTranslation();
  const { invoiceStatusOptions } = usePreferences();
  const { success, error } = useNotification();
  const { mutateAsync } = useReturns.document.updateCustomerReturn();

  const { data } = useReturns.document.customerReturn();

  const { status, lines, linkedShipment, id } = data ?? {
    status: InvoiceNodeStatus.New,
    lines: { totalCount: 0 },
  };

  const isDisabled = data ? isInboundStatusChangeDisabled(data) : true;

  const lineCount = lines.totalCount;

  const isManuallyCreated = !linkedShipment?.id;

  const options = useMemo(() => {
    let statusOptions = getStatusOptions(
      status,
      getButtonLabel(t),
      isManuallyCreated
    );
    if (invoiceStatusOptions) {
      statusOptions = statusOptions.filter(
        option =>
          option.value !== undefined &&
          invoiceStatusOptions.includes(option.value)
      );
    }
    return statusOptions;
  }, [status, isManuallyCreated, invoiceStatusOptions]);

  const currentStatus = invoiceStatusOptions?.includes(status)
    ? status
    : getPreviousStatus(
        status,
        invoiceStatusOptions ?? [],
        customerReturnStatuses
      );

  const [selectedOption, setSelectedOption] =
    useState<SplitButtonOption<InvoiceNodeStatus> | null>(() =>
      getNextStatusOption(currentStatus, options)
    );

  const onConfirmStatusChange = async () => {
    if (!selectedOption || !id) return null;
    try {
      await mutateAsync({ id, status: selectedOption.value });

      success(t('messages.return-saved'))();
    } catch (e) {
      error(t('messages.error-saving-return'))();
    }
  };

  const getConfirmation = useConfirmationModal({
    title: t('heading.are-you-sure'),
    message: t('messages.confirm-status-as', {
      status: selectedOption?.value
        ? getStatusTranslation(selectedOption?.value)
        : '',
    }),
    onConfirm: onConfirmStatusChange,
  });

  // When the status of the invoice changes (after an update), set the selected
  // option to the next status. It would be set to the current status, which is
  // now a disabled option.
  useEffect(() => {
    setSelectedOption(() => getNextStatusOption(currentStatus, options));
  }, [status, options, currentStatus]);

  return {
    options,
    selectedOption,
    setSelectedOption,
    getConfirmation,
    isDisabled,
    lineCount,
  };
};

export const StatusChangeButton = () => {
  const {
    options,
    selectedOption,
    setSelectedOption,
    getConfirmation,
    isDisabled,
    lineCount,
  } = useStatusChangeButton();
  const t = useTranslation();
  const noLines = lineCount === 0;

  if (!selectedOption) return null;
  if (isDisabled) return null;

  const onStatusClick = () => {
    return getConfirmation();
  };

  return (
    <SplitButton
      label={noLines ? t('messages.no-lines') : ''}
      isDisabled={noLines}
      options={options}
      selectedOption={selectedOption}
      onSelectOption={setSelectedOption}
      Icon={<ArrowRightIcon />}
      onClick={onStatusClick}
    />
  );
};
