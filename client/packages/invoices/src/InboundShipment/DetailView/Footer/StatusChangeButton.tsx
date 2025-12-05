import React, { useMemo, useState, useEffect } from 'react';
import {
  ArrowRightIcon,
  useTranslation,
  useNotification,
  InvoiceNodeStatus,
  SplitButton,
  SplitButtonOption,
  useConfirmationModal,
  useDisabledNotificationToast,
  UserPermission,
  useAuthContext,
  usePreferences,
} from '@openmsupply-client/common';
import {
  getStatusTranslation,
  isInboundPlaceholderRow,
  getButtonLabel,
  getNextStatusOption,
  inboundStatuses,
  getPreviousStatus,
} from '../../../utils';
import { InboundLineFragment, useInbound } from '../../api';

const getStatusOptions = (
  currentStatus: InvoiceNodeStatus,
  getButtonLabel: (status: InvoiceNodeStatus) => string,
  isManuallyCreated: boolean
): SplitButtonOption<InvoiceNodeStatus>[] => {
  // Manual workflows skip Picked and Shipped statuses
  const statuses = isManuallyCreated
    ? [
        InvoiceNodeStatus.New,
        InvoiceNodeStatus.Delivered,
        InvoiceNodeStatus.Received,
        InvoiceNodeStatus.Verified,
      ]
    : [
        InvoiceNodeStatus.New,
        InvoiceNodeStatus.Picked,
        InvoiceNodeStatus.Shipped,
        InvoiceNodeStatus.Delivered,
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
      if (options[3]) options[3].isDisabled = false;
    }
    if (currentStatus === InvoiceNodeStatus.Delivered) {
      if (options[2]) options[2].isDisabled = false;
      if (options[3]) options[3].isDisabled = false;
    }
    if (currentStatus === InvoiceNodeStatus.Received) {
      if (options[3]) options[3].isDisabled = false;
    }
  } else {
    if (currentStatus === InvoiceNodeStatus.Shipped) {
      if (options[3]) options[3].isDisabled = false;
      if (options[4]) options[4].isDisabled = false;
      if (options[5]) options[5].isDisabled = false;
    }
    if (currentStatus === InvoiceNodeStatus.Delivered) {
      if (options[4]) options[4].isDisabled = false;
      if (options[5]) options[5].isDisabled = false;
    }
    if (currentStatus === InvoiceNodeStatus.Received) {
      if (options[5]) options[5].isDisabled = false;
    }
  }

  return options;
};

const useStatusChangeButton = () => {
  const t = useTranslation();
  const { invoiceStatusOptions } = usePreferences();
  const { status, onHold, linkedShipment, update, lines } =
    useInbound.document.fields(['status', 'onHold', 'linkedShipment', 'lines']);
  const { success, error } = useNotification();
  const isManuallyCreated = !linkedShipment?.id;

  const options = useMemo(() => {
    let statusOptions = getStatusOptions(
      status,
      getButtonLabel(t),
      isManuallyCreated
    );
    if (invoiceStatusOptions) {
      statusOptions = statusOptions.filter(
        option => !!option.value && invoiceStatusOptions.includes(option.value)
      );
    }
    return statusOptions;
  }, [status, isManuallyCreated, invoiceStatusOptions]);

  const currentStatus = invoiceStatusOptions?.includes(status)
    ? status
    : getPreviousStatus(status, invoiceStatusOptions ?? [], inboundStatuses);

  const [selectedOption, setSelectedOption] =
    useState<SplitButtonOption<InvoiceNodeStatus> | null>(() =>
      getNextStatusOption(currentStatus, options)
    );

  const onConfirmStatusChange = async () => {
    if (!selectedOption) return null;
    try {
      await update({ status: selectedOption.value });
      success(t('messages.shipment-saved'))();
    } catch (e) {
      error(t('messages.error-saving-shipment'))();
    }
  };

  const getConfirmation = useConfirmationModal({
    title: t('heading.are-you-sure'),
    message: `${t('messages.confirm-inbound-status-as', {
      status: selectedOption?.value
        ? getStatusTranslation(selectedOption?.value)
        : '',
    })}\n${
      status === InvoiceNodeStatus.New
        ? t('messages.confirm-changing-from-new')
        : ''
    }`,
    onConfirm: onConfirmStatusChange,
  });

  // When the status of the invoice changes (after an update), set the selected option to the next status.
  // It would be set to the current status, which is now a disabled option.
  useEffect(() => {
    setSelectedOption(() => getNextStatusOption(currentStatus, options));
  }, [status, options]);

  return {
    options,
    selectedOption,
    setSelectedOption,
    getConfirmation,
    onHold,
    lines,
  };
};

export const validateEmptyInvoice = (lines: {
  totalCount: number;
  nodes: InboundLineFragment[];
}): boolean => {
  // Should only proceed if there is at least one line
  // If lines are from transfer, they can be 0
  // Manually added lines must have either received or shipped packs defined
  if (
    lines.totalCount === 0 ||
    lines.nodes.every(l => !l.linkedInvoiceId && isInboundPlaceholderRow(l))
  )
    return false;
  return true;
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
  const t = useTranslation();
  const { userHasPermission } = useAuthContext();
  const isStatusChangeDisabled = useInbound.utils.isStatusChangeDisabled();

  const onVerify = () => {
    if (userHasPermission(UserPermission.InboundShipmentVerify)) {
      getConfirmation();
    } else {
      permissionDeniedNotification();
    }
  };

  const noLinesNotification = useDisabledNotificationToast(
    t('messages.no-lines')
  );

  const onHoldNotification = useDisabledNotificationToast(
    t('messages.on-hold')
  );

  const permissionDeniedNotification = useDisabledNotificationToast(
    t('auth.permission-denied')
  );

  if (!selectedOption) return null;
  if (isStatusChangeDisabled) return null;

  const onStatusClick = () => {
    if (!validateEmptyInvoice(lines)) return noLinesNotification();
    if (onHold) return onHoldNotification();
    if (selectedOption?.value === InvoiceNodeStatus.Verified) return onVerify();
    return getConfirmation();
  };

  return (
    <SplitButton
      options={options}
      selectedOption={selectedOption}
      onSelectOption={setSelectedOption}
      Icon={<ArrowRightIcon />}
      onClick={onStatusClick}
    />
  );
};
