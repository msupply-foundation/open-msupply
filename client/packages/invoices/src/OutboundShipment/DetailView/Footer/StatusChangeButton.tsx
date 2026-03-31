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
  useAlertModal,
  InvoiceLineNodeType,
  useDisabledNotificationToast,
  usePreferences,
} from '@openmsupply-client/common';
import {
  getPreviousStatus,
  getButtonLabel,
  getNextStatusOption,
  getStatusTranslator,
} from '../../../utils';
import { useOutbound, useOutboundLines } from '../../api';
import { getStatusOptions, getStatusSequence } from '../../../statuses';

const useStatusChangeButton = () => {
  const t = useTranslation();
  const { invoiceStatusOptions } = usePreferences();
  const { lines, status, onHold } = useOutbound.document.fields([
    'status',
    'onHold',
    'lines',
  ]);
  const { mutateAsync: update } = useOutbound.document.update();
  const { success, error, info } = useNotification();
  const { data } = useOutbound.document.get();
  const hasLinesToPrune =
    data?.status === InvoiceNodeStatus.New &&
    (data?.lines?.nodes ?? []).some(line => line.numberOfPacks === 0);

  const options = useMemo(() => {
    let statusOptions = getStatusOptions(
      InvoiceNodeType.OutboundShipment,
      status,
      getButtonLabel(t)
    );
    if (invoiceStatusOptions) {
      statusOptions = statusOptions.filter(
        option => !!option.value && invoiceStatusOptions.includes(option.value)
      );
    }
    return statusOptions;
  }, [status, getButtonLabel, invoiceStatusOptions]);

  // If the status has already been set, but is not included in the preferences,
  // then use the previous valid status.
  const currentStatus =
    !invoiceStatusOptions || invoiceStatusOptions.includes(status)
      ? status
      : getPreviousStatus(
          status,
          invoiceStatusOptions,
          getStatusSequence(InvoiceNodeType.OutboundShipment)
        );

  const [selectedOption, setSelectedOption] =
    useState<SplitButtonOption<InvoiceNodeStatus> | null>(() =>
      getNextStatusOption(currentStatus, options)
    );

  const onConfirmStatusChange = async () => {
    if (!selectedOption) return;
    try {
      const responses = await update({
        id: data?.id ?? '',
        status: selectedOption.value,
      });
      const updateError = responses?.find(
        res => res?.__typename === 'UpdateOutboundShipmentError'
      );
      if (updateError?.__typename === 'UpdateOutboundShipmentError') {
        switch (updateError.error.__typename) {
          case 'CannotHaveEstimatedDeliveryDateBeforeShippedDate':
            info(t('error.estimated-delivery-before-shipped-date'))();
            break;
          default:
            error(t('messages.error-saving-shipment'))();
            break;
        }
      } else {
        success(t('messages.shipment-saved'))();
      }
    } catch (e) {
      error(t('messages.error-saving-shipment'))();
    }
  };

  const getConfirmation = useConfirmationModal({
    title: t('heading.are-you-sure'),
    message: hasLinesToPrune
      ? t('messages.confirm-zero-quantity-status')
      : t('messages.confirm-status-as', {
          status: selectedOption?.value
            ? getStatusTranslator(t)(selectedOption?.value)
            : '',
        }),
    onConfirm: onConfirmStatusChange,
  });

  // When the status of the invoice changes (after an update), set the selected option to the next status.
  // It would be set to the current status, which is now a disabled option.
  useEffect(() => {
    setSelectedOption(() => getNextStatusOption(currentStatus, options));
  }, [status, options, currentStatus]);

  return {
    options,
    selectedOption,
    setSelectedOption,
    getConfirmation,
    onHold,
    lines,
  };
};

const useStatusChangePlaceholderCheck = () => {
  const t = useTranslation();
  const { data: lines } = useOutboundLines();
  const alert = useAlertModal({
    title: t('heading.cannot-do-that'),
    message: t('messages.must-allocate-all-lines'),
  });

  const hasPlaceholder = useMemo(
    () =>
      !!lines?.some(
        ({ type, numberOfPacks }) =>
          type === InvoiceLineNodeType.UnallocatedStock && numberOfPacks > 0
      ),
    [lines]
  );

  return { alert, hasPlaceholder };
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
  const { hasPlaceholder, alert } = useStatusChangePlaceholderCheck();
  const isDisabled = useOutbound.utils.isDisabled();
  const t = useTranslation();
  const noLines =
    lines?.totalCount === 0 ||
    lines?.nodes?.every(l => l.type === InvoiceLineNodeType.UnallocatedStock);

  const noLinesNotification = useDisabledNotificationToast(
    t('messages.no-lines')
  );

  const onHoldNotification = useDisabledNotificationToast(
    t('messages.on-hold-outbound')
  );

  if (!selectedOption) return null;
  if (isDisabled) return null;

  const onStatusClick = () => {
    if (hasPlaceholder) return alert();
    if (noLines) return noLinesNotification();
    if (onHold) return onHoldNotification();
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
