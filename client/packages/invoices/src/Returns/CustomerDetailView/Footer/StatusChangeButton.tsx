import React, { useMemo, useState, useEffect } from 'react';
import {
  ArrowRightIcon,
  useTranslation,
  useNotification,
  InvoiceNodeStatus,
  InvoiceNodeType,
  SplitButton,
  SplitButtonOption,
  useConfirmationModal,
  usePreferences,
} from '@openmsupply-client/common';
import {
  getButtonLabel,
  getNextStatusOption,
  getPreviousStatus,
  getStatusTranslator,
  isInboundStatusChangeDisabled,
} from '../../../utils';
import { useReturns } from '../../api';
import { getStatusOptions, getStatusSequence } from '../../../statuses';

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
      InvoiceNodeType.CustomerReturn,
      status,
      getButtonLabel(t),
      { isManuallyCreated }
    );
    if (invoiceStatusOptions) {
      statusOptions = statusOptions.filter(
        option => !!option.value && invoiceStatusOptions.includes(option.value)
      );
    }
    return statusOptions;
  }, [status, isManuallyCreated, invoiceStatusOptions]);

  const currentStatus =
    !invoiceStatusOptions || invoiceStatusOptions.includes(status)
      ? status
      : getPreviousStatus(
          status,
          invoiceStatusOptions,
          getStatusSequence(InvoiceNodeType.CustomerReturn, {
            isManuallyCreated,
          })
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
        ? getStatusTranslator(t)(selectedOption?.value)
        : '',
    }),
    onConfirm: onConfirmStatusChange,
  });

  // When the status of the invoice changes (after an update), set the selected
  // option to the next status. It would be set to the current status, which is
  // now a disabled option.
  useEffect(() => {
    setSelectedOption(() => getNextStatusOption(currentStatus, options));
  }, [options, currentStatus]);

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
