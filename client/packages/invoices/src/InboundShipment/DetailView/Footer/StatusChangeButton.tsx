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
  isInboundPlaceholderRow,
  getButtonLabel,
  getNextStatusOption,
  inboundStatuses,
  getPreviousStatus,
  getStatusTranslator,
  InboundShipmentType,
  getInboundShipmentType,
  getInboundStatusesForType,
} from '../../../utils';
import { InboundLineFragment, useInboundShipment } from '../../api';

const getStatusOptions = (
  currentStatus: InvoiceNodeStatus,
  getButtonLabel: (status: InvoiceNodeStatus) => string,
  shipmentType: InboundShipmentType
): SplitButtonOption<InvoiceNodeStatus>[] => {
  const statuses = getInboundStatusesForType(shipmentType);

  const options = statuses.map(status => ({
    value: status,
    label: getButtonLabel(status),
    isDisabled: true,
  }));

  // Enable options that can be progressed to from the current status
  const currentIdx = statuses.indexOf(currentStatus);
  for (let i = currentIdx + 1; i < options.length; i++) {
    const option = options[i];
    if (option) option.isDisabled = false;
  }

  return options;
};

const StatusChangeButtonContent = ({
  data,
  update,
  isStatusChangeDisabled,
}: {
  data: NonNullable<ReturnType<typeof useInboundShipment>['query']['data']>;
  update: ReturnType<typeof useInboundShipment>['update']['update'];
  isStatusChangeDisabled: boolean;
}) => {
  const t = useTranslation();
  const { invoiceStatusOptions } = usePreferences();
  const { success, error } = useNotification();
  const { userHasPermission } = useAuthContext();

  const { status, onHold, lines } = data;
  const shipmentType = getInboundShipmentType(data);

  const options = useMemo(() => {
    let statusOptions = getStatusOptions(
      status,
      getButtonLabel(t),
      shipmentType
    );
    if (invoiceStatusOptions) {
      statusOptions = statusOptions.filter(
        option => !!option.value && invoiceStatusOptions.includes(option.value)
      );
    }
    return statusOptions;
  }, [status, shipmentType, invoiceStatusOptions, t]);

  const currentStatus = invoiceStatusOptions?.includes(status)
    ? status
    : getPreviousStatus(status, invoiceStatusOptions ?? [], inboundStatuses);

  const [selectedOption, setSelectedOption] =
    useState<SplitButtonOption<InvoiceNodeStatus> | null>(() =>
      getNextStatusOption(currentStatus, options)
    );

  const onConfirmStatusChange = async () => {
    if (!selectedOption) return;
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
        ? getStatusTranslator(t)(selectedOption?.value)
        : '',
    })}\n${
      status === InvoiceNodeStatus.New
        ? t('messages.confirm-changing-from-new')
        : ''
    }`,
    onConfirm: onConfirmStatusChange,
  });

  useEffect(() => {
    setSelectedOption(() => getNextStatusOption(currentStatus, options));
  }, [status, options, currentStatus]);

  const noLinesNotification = useDisabledNotificationToast(
    t('messages.no-lines')
  );

  const onHoldNotification = useDisabledNotificationToast(
    t('messages.on-hold-inbound')
  );

  const permissionDeniedNotification = useDisabledNotificationToast(
    t('auth.permission-denied')
  );

  const pendingLinesNotification = useDisabledNotificationToast(
    t('messages.pending-lines')
  );

  const onVerify = () => {
    if (userHasPermission(UserPermission.InboundShipmentVerify)) {
      getConfirmation();
    } else {
      permissionDeniedNotification();
    }
  };

  if (!selectedOption) return null;
  if (isStatusChangeDisabled) return null;

  const onStatusClick = () => {
    if (!validateEmptyInvoice(lines)) return noLinesNotification();
    if (onHold) return onHoldNotification();
    if (
      selectedOption?.value === InvoiceNodeStatus.Received ||
      selectedOption?.value === InvoiceNodeStatus.Verified
    ) {
      if (!validateNoPendingLines(lines)) {
        return pendingLinesNotification();
      }
    }
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

const validateNoPendingLines = (lines: {
  totalCount: number;
  nodes: InboundLineFragment[];
}): boolean => {
  // Should only proceed if there are no pending lines
  if (lines.nodes.some(line => line.status === 'PENDING')) return false;
  return true;
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
    query: { data, loading },
    update: { update },
    isStatusChangeDisabled,
  } = useInboundShipment();

  if (loading || !data) return null;

  return (
    <StatusChangeButtonContent
      data={data}
      update={update}
      isStatusChangeDisabled={isStatusChangeDisabled}
    />
  );
};
