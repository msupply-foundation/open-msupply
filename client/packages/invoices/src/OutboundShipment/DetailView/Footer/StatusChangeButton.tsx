import React, { useMemo, useState, useEffect } from 'react';
import {
  ArrowRightIcon,
  useTranslation,
  useNotification,
  InvoiceNodeStatus,
  SplitButton,
  SplitButtonOption,
  useConfirmationModal,
  useAlertModal,
  InvoiceLineNodeType,
  useDisabledNotificationToast,
  usePreferences,
} from '@openmsupply-client/common';
import {
  getStatusTranslation,
  getPreviousStatus,
  outboundStatuses,
  getButtonLabel,
  getNextStatusOption,
} from '../../../utils';
import { useOutbound, useOutboundLines } from '../../api';

const getStatusOptions = (
  currentStatus: InvoiceNodeStatus,
  getButtonLabel: (status: InvoiceNodeStatus) => string
): SplitButtonOption<InvoiceNodeStatus>[] => {
  const options: [
    SplitButtonOption<InvoiceNodeStatus>,
    SplitButtonOption<InvoiceNodeStatus>,
    SplitButtonOption<InvoiceNodeStatus>,
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
      value: InvoiceNodeStatus.Allocated,
      label: getButtonLabel(InvoiceNodeStatus.Allocated),
      isDisabled: true,
    },
    {
      value: InvoiceNodeStatus.Picked,
      label: getButtonLabel(InvoiceNodeStatus.Picked),
      isDisabled: true,
    },
    {
      value: InvoiceNodeStatus.Shipped,
      label: getButtonLabel(InvoiceNodeStatus.Shipped),
      isDisabled: true,
    },
    {
      value: InvoiceNodeStatus.Delivered,
      label: getButtonLabel(InvoiceNodeStatus.Delivered),
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
    options[3].isDisabled = false;
  }

  if (currentStatus === InvoiceNodeStatus.Allocated) {
    options[2].isDisabled = false;
    options[3].isDisabled = false;
  }

  if (currentStatus === InvoiceNodeStatus.Picked) {
    options[3].isDisabled = false;
  }

  return options;
};

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
    let statusOptions = getStatusOptions(status, getButtonLabel(t));
    if (invoiceStatusOptions) {
      statusOptions = statusOptions.filter(
        option =>
          option.value !== undefined &&
          invoiceStatusOptions.includes(option.value)
      );
    }
    return statusOptions;
  }, [status, getButtonLabel, invoiceStatusOptions]);

  // If the status has already been set, but is not included in the preferences,
  // then use the previous valid status.
  const currentStatus = invoiceStatusOptions?.includes(status)
    ? status
    : getPreviousStatus(status, invoiceStatusOptions ?? [], outboundStatuses);

  const [selectedOption, setSelectedOption] =
    useState<SplitButtonOption<InvoiceNodeStatus> | null>(() =>
      getNextStatusOption(currentStatus, options)
    );

  const onConfirmStatusChange = async () => {
    if (!selectedOption) return null;
    try {
      await update({
        id: data?.id ?? '',
        status: selectedOption.value,
      }).then(res => {
        res?.forEach(res => {
          if (
            res.__typename === 'UpdateOutboundShipmentError' &&
            res.error.__typename ===
              'CannotHaveEstimatedDeliveryDateBeforeShippedDate'
          ) {
            info(t('error.estimated-delivery-before-shipped-date'))();
          } else {
            success(t('messages.shipment-saved'))();
          }
        });
      });
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
            ? getStatusTranslation(selectedOption?.value)
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
    t('messages.on-hold')
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
