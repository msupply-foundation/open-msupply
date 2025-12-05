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
  getButtonLabel,
  getNextStatusOption,
  getPreviousStatus,
  getStatusTranslation,
  supplierReturnStatuses,
} from '../../../utils';
import { useReturns } from '../../api';

const getStatusOptions = (
  currentStatus: InvoiceNodeStatus,
  getButtonLabel: (status: InvoiceNodeStatus) => string
): SplitButtonOption<InvoiceNodeStatus>[] => {
  const options: SplitButtonOption<InvoiceNodeStatus>[] = [
    InvoiceNodeStatus.New,
    InvoiceNodeStatus.Picked,
    InvoiceNodeStatus.Shipped,
    InvoiceNodeStatus.Delivered,
    InvoiceNodeStatus.Verified,
  ].map(status => ({
    value: status,
    label: getButtonLabel(status),
    isDisabled: true,
  }));

  if (currentStatus === InvoiceNodeStatus.New) {
    if (options[1]) options[1].isDisabled = false;
    if (options[2]) options[2].isDisabled = false;
  }

  if (currentStatus === InvoiceNodeStatus.Picked) {
    if (options[2]) options[2].isDisabled = false;
  }

  return options;
};

const useStatusChangeButton = () => {
  const t = useTranslation();
  const { invoiceStatusOptions } = usePreferences();
  const { success, error } = useNotification();
  const { data } = useReturns.document.supplierReturn();
  const { mutateAsync } = useReturns.document.updateSupplierReturn();

  const status = data?.status ?? InvoiceNodeStatus.New;

  // TODO: lines
  const lines: { totalCount: number; nodes: unknown[] } = {
    totalCount: 1,
    nodes: [],
  };

  const options = useMemo(() => {
    let statusOptions = getStatusOptions(status, getButtonLabel(t));
    if (invoiceStatusOptions) {
      statusOptions = statusOptions.filter(
        option => !!option.value && invoiceStatusOptions.includes(option.value)
      );
    }
    return statusOptions;
  }, [status, invoiceStatusOptions]);

  const currentStatus = invoiceStatusOptions?.includes(status)
    ? status
    : getPreviousStatus(
        status,
        invoiceStatusOptions ?? [],
        supplierReturnStatuses
      );

  const [selectedOption, setSelectedOption] =
    useState<SplitButtonOption<InvoiceNodeStatus> | null>(() =>
      getNextStatusOption(currentStatus, options)
    );

  const onConfirmStatusChange = async () => {
    if (!selectedOption || !data) return null;
    try {
      await mutateAsync({ id: data?.id, status: selectedOption.value });

      success(t('messages.return-saved'))();
    } catch (e) {
      console.error(e);
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
  }, [currentStatus, options]);

  return {
    options,
    selectedOption,
    setSelectedOption,
    getConfirmation,
    onHold: data?.onHold ?? false,
    lines,
  };
};

export const StatusChangeButton = () => {
  const {
    options,
    selectedOption,
    setSelectedOption,
    getConfirmation,
    onHold,
    lines,
  } = useStatusChangeButton();
  const isDisabled = useReturns.utils.supplierIsDisabled();
  const t = useTranslation();
  const noLines = lines?.totalCount === 0;

  if (!selectedOption) return null;
  if (isDisabled) return null;

  const onStatusClick = () => {
    return getConfirmation();
  };

  return (
    <SplitButton
      label={noLines ? t('messages.no-lines') : ''}
      isDisabled={noLines || onHold}
      options={options}
      selectedOption={selectedOption}
      onSelectOption={setSelectedOption}
      Icon={<ArrowRightIcon />}
      onClick={onStatusClick}
    />
  );
};
