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
  Tooltip,
  useIntlUtils,
} from '@openmsupply-client/common';
import { getNextRequestStatus, getStatusTranslation } from '../../../utils';
import { useRequest } from '../../api';

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
  const { status, update, comment, lines } = useRequest.document.fields([
    'status',
    'comment',
    'lines',
  ]);
  const { success, error } = useNotification();
  const t = useTranslation('replenishment');
  const { user } = useAuthContext();
  const { getLocalisedFullName } = useIntlUtils();

  const options = useMemo(
    () => getStatusOptions(status, getButtonLabel(t)),
    [status, getButtonLabel]
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
      phone: user?.phoneNumber ?? '-',
      email: user?.email ?? '-',
    })}`;
  };

  const onConfirmStatusChange = async () => {
    if (!selectedOption) return null;
    try {
      await update({
        status: selectedOption.value,
        comment: getUpdatedComment(),
      });
      success(t('messages.saved'))();
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
  const { selectedOption, getConfirmation, lines } = useStatusChangeButton();
  const isDisabled = useRequest.utils.isDisabled();
  const { userHasPermission } = useAuthContext();
  const t = useTranslation('app');
  const noLines = lines?.totalCount === 0;

  if (!selectedOption) return null;
  if (isDisabled) return null;

  const hasPermission =
    selectedOption.value === RequisitionNodeStatus.Sent
      ? userHasPermission(UserPermission.RequisitionSend)
      : true;
  const permissionDenied = hasPermission ? '' : t('auth.permission-denied');
  const disabledNoLines = noLines ? t('messages.no-lines') : '';

  return (
    <>
      <Tooltip title={permissionDenied || disabledNoLines}>
        <div>
          <ButtonWithIcon
            color="secondary"
            variant="contained"
            disabled={!hasPermission || noLines}
            label={selectedOption.label}
            Icon={<ArrowRightIcon />}
            onClick={() => getConfirmation()}
          />
        </div>
      </Tooltip>
    </>
  );
};
