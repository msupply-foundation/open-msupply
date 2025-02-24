import React, { useMemo, useState, useEffect } from 'react';
import {
  ArrowRightIcon,
  useTranslation,
  useNotification,
  SplitButtonOption,
  useConfirmationModal,
  RequisitionNodeStatus,
  ButtonWithIcon,
  useAuthContext,
  UserPermission,
  useIntlUtils,
  useDisabledNotificationToast,
  UNDEFINED_STRING_VALUE,
  noOtherVariants,
  mapKeys,
  mapValues,
} from '@openmsupply-client/common';
import { getNextRequestStatus, getStatusTranslation } from '../../../utils';
import { useRequest } from '../../api';
import { useRequestRequisitionLineErrorContext } from '../../context';

const getStatusOptions = (
  currentStatus: RequisitionNodeStatus,
  getButtonLabel: (status: RequisitionNodeStatus) => string
): SplitButtonOption<RequisitionNodeStatus>[] => {
  const options: [
    SplitButtonOption<RequisitionNodeStatus>,
    SplitButtonOption<RequisitionNodeStatus>,
    SplitButtonOption<RequisitionNodeStatus>,
  ] = [
    {
      value: RequisitionNodeStatus.Draft,
      label: getButtonLabel(RequisitionNodeStatus.Draft),
      isDisabled: true,
    },
    {
      value: RequisitionNodeStatus.Sent,
      label: getButtonLabel(RequisitionNodeStatus.Sent),
      isDisabled: true,
    },
    {
      value: RequisitionNodeStatus.Finalised,
      label: getButtonLabel(RequisitionNodeStatus.Finalised),
      isDisabled: true,
    },
  ];

  if (currentStatus === RequisitionNodeStatus.Draft) {
    options[1].isDisabled = false;
  }

  return options;
};

const getNextStatusOption = (
  status: RequisitionNodeStatus,
  options: SplitButtonOption<RequisitionNodeStatus>[]
): SplitButtonOption<RequisitionNodeStatus> | null => {
  if (!status) return options[0] ?? null;

  const nextStatus = getNextRequestStatus(status);
  const nextStatusOption = options.find(o => o.value === nextStatus);
  return nextStatusOption || null;
};

const getButtonLabel =
  (t: ReturnType<typeof useTranslation>) =>
  (invoiceStatus: RequisitionNodeStatus): string => {
    return t('button.save-and-confirm-status', {
      status: t(getStatusTranslation(invoiceStatus)),
    });
  };

const useStatusChangeButton = () => {
  const { id, status, comment, lines } = useRequest.document.fields([
    'id',
    'status',
    'comment',
    'lines',
  ]);
  const { mutateAsync: update } = useRequest.document.update();
  const { success, error } = useNotification();
  const t = useTranslation();
  const { user } = useAuthContext();
  const { getLocalisedFullName } = useIntlUtils();
  const errorsContext = useRequestRequisitionLineErrorContext();

  const options = useMemo(
    () => getStatusOptions(status, getButtonLabel(t)),
    [status, t]
  );

  const [selectedOption, setSelectedOption] =
    useState<SplitButtonOption<RequisitionNodeStatus> | null>(() =>
      getNextStatusOption(status, options)
    );

  const getUpdatedComment = () => {
    if (selectedOption?.value !== RequisitionNodeStatus.Sent) {
      return comment;
    }

    const name =
      getLocalisedFullName(user?.firstName, user?.lastName) || user?.name;
    const job = !!user?.jobTitle ? ` (${user?.jobTitle})` : '';

    return `${comment ? comment + '\n' : ''}${t('template.requisition-sent', {
      name,
      job,
      phone: user?.phoneNumber ?? UNDEFINED_STRING_VALUE,
      email: user?.email ?? UNDEFINED_STRING_VALUE,
    })}`;
  };

  const mapStructuredErrors = (result: Awaited<ReturnType<typeof update>>) => {
    if (result.__typename === 'RequisitionNode') {
      return undefined;
    }

    const { error } = result;

    switch (error.__typename) {
      case 'RequisitionReasonsNotProvided': {
        const ids = mapValues(
          mapKeys(lines.nodes, line => line?.id),
          'id'
        );
        const mappedErrors = mapKeys(
          error.errors,
          line => ids[line.requisitionLine.id]
        );
        errorsContext.setErrors(mappedErrors);
        return t('error.reasons-not-provided-program-requisition');
      }
      case 'OrderingTooManyItems':
        return t('error.ordering-too-many-items', {
          count: error.maxItemsInEmergencyOrder,
        });
      case 'OtherPartyNotASupplier':
        return t('error.other-party-not-a-supplier');
      case 'CannotEditRequisition':
        return t('error.cannot-edit-requisition');
      case 'OtherPartyNotVisible':
        return t('error.other-party-not-visible');
      case 'RecordNotFound':
        return t('messages.record-not-found');
      default:
        return noOtherVariants(error);
    }
  };

  const onConfirmStatusChange = async () => {
    if (!selectedOption) return null;
    let result;
    try {
      result = await update({
        id,
        status: selectedOption.value,
        comment: getUpdatedComment(),
      });
      const errorMessage = mapStructuredErrors(result);

      if (errorMessage) {
        error(errorMessage)();
      } else {
        success(t('messages.saved'))();
      }
    } catch (e) {
      error(t('messages.could-not-save'))();
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

  // When the status changes (after an update), set the selected option to the next status.
  // Otherwise, it would be set to the current status, which is now a disabled option.
  useEffect(() => {
    setSelectedOption(() => getNextStatusOption(status, options));
  }, [status, options]);

  return { options, selectedOption, setSelectedOption, getConfirmation, lines };
};

export const StatusChangeButton = () => {
  const t = useTranslation();
  const { selectedOption, getConfirmation, lines } = useStatusChangeButton();
  const isDisabled = useRequest.utils.isDisabled();
  const { userHasPermission } = useAuthContext();
  const cantSend =
    lines?.totalCount === 0 ||
    lines?.nodes?.every(line => line?.requestedQuantity === 0);
  const showPermissionDenied = useDisabledNotificationToast(
    t('auth.permission-denied')
  );
  const showCantSend = useDisabledNotificationToast(
    t('messages.cant-send-order')
  );

  if (!selectedOption) return null;
  if (isDisabled) return null;

  const hasPermission =
    selectedOption.value === RequisitionNodeStatus.Sent
      ? userHasPermission(UserPermission.RequisitionSend)
      : true;

  const onClick = () => {
    if (!hasPermission) return showPermissionDenied();
    if (cantSend) return showCantSend();

    getConfirmation();
  };

  return (
    <div>
      <ButtonWithIcon
        color="secondary"
        variant="contained"
        label={selectedOption.label}
        Icon={<ArrowRightIcon />}
        onClick={onClick}
      />
    </div>
  );
};
