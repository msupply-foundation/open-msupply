import React, { useMemo, useState, useEffect } from 'react';
import {
  ArrowRightIcon,
  useTranslation,
  useNotification,
  SplitButton,
  SplitButtonOption,
  useConfirmationModal,
  RequisitionNodeStatus,
  mapKeys,
  mapValues,
  noOtherVariants,
} from '@openmsupply-client/common';
import { getNextResponseStatus, getStatusTranslation } from '../../../utils';
import { ResponseFragment, useResponse } from '../../api';
import { useResponseRequisitionLineErrorContext } from '../../context';

const getStatusOptions = (
  currentStatus: RequisitionNodeStatus,
  getButtonLabel: (status: RequisitionNodeStatus) => string
): SplitButtonOption<RequisitionNodeStatus>[] => {
  const options: [
    SplitButtonOption<RequisitionNodeStatus>,
    SplitButtonOption<RequisitionNodeStatus>,
  ] = [
    {
      value: RequisitionNodeStatus.New,
      label: getButtonLabel(RequisitionNodeStatus.New),
      isDisabled: true,
    },
    {
      value: RequisitionNodeStatus.Finalised,
      label: getButtonLabel(RequisitionNodeStatus.Finalised),
      isDisabled: true,
    },
  ];

  if (currentStatus === RequisitionNodeStatus.New) {
    options[1].isDisabled = false;
  }

  return options;
};

const getNextStatusOption = (
  status: RequisitionNodeStatus,
  options: SplitButtonOption<RequisitionNodeStatus>[]
): SplitButtonOption<RequisitionNodeStatus> | null => {
  if (!status) return options[0] ?? null;

  const nextStatus = getNextResponseStatus(status);
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

const useStatusChangeButton = (requisition: ResponseFragment) => {
  const { id, lines, status, shipments } = useResponse.document.fields([
    'id',
    'lines',
    'status',
    'shipments',
  ]);
  const { mutateAsync: save } = useResponse.document.update();

  const { success, error } = useNotification();
  const t = useTranslation();

  const errorsContext = useResponseRequisitionLineErrorContext();

  const options = useMemo(
    () => getStatusOptions(status, getButtonLabel(t)),
    [status, t]
  );

  const isDisabled = useResponse.utils.isDisabled();

  const notFullySuppliedLines = requisition.lines.nodes.filter(
    line => line.remainingQuantityToSupply > 0
  ).length;

  const [selectedOption, setSelectedOption] =
    useState<SplitButtonOption<RequisitionNodeStatus> | null>(() =>
      getNextStatusOption(status, options)
    );

  const mapStructuredErrors = (result: Awaited<ReturnType<typeof save>>) => {
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
      case 'CannotEditRequisition':
        return t('error.cannot-edit-requisition');
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
      result = await save({ id, status: selectedOption.value });
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

  const confirmationTitle =
    selectedOption?.value === RequisitionNodeStatus.Finalised &&
    notFullySuppliedLines > 0
      ? t('heading.confirm-finalise')
      : t('heading.are-you-sure');

  const confirmationMessage =
    notFullySuppliedLines > 0
      ? t('messages.confirm-not-fully-supplied', {
          count: notFullySuppliedLines,
        })
      : t('messages.confirm-status-as', {
          status: selectedOption?.value
            ? getStatusTranslation(selectedOption?.value)
            : '',
        });

  const confirmationInfo = () => {
    if (shipments?.totalCount === 0 && !isDisabled) {
      return t('info.no-shipment');
    }
  };

  const getConfirmation = useConfirmationModal({
    title: confirmationTitle,
    message: confirmationMessage,
    info: confirmationInfo(),
    onConfirm: onConfirmStatusChange,
  });

  // When the status of the requisition changes (after an update), set the selected option to the next status.
  // Otherwise, it would be set to the current status, which is now a disabled option.
  useEffect(() => {
    setSelectedOption(() => getNextStatusOption(status, options));
  }, [status, options]);

  return { options, selectedOption, setSelectedOption, getConfirmation };
};

export const StatusChangeButton = ({
  requisition,
}: {
  requisition: ResponseFragment;
}) => {
  const { options, selectedOption, setSelectedOption, getConfirmation } =
    useStatusChangeButton(requisition);
  const isDisabled = useResponse.utils.isDisabled();
  const isDisabledByAuthorisation =
    useResponse.utils.isDisabledByAuthorisation();

  if (!selectedOption) return null;
  if (isDisabled && !isDisabledByAuthorisation) return null;

  return (
    <SplitButton
      options={options}
      selectedOption={selectedOption}
      onSelectOption={setSelectedOption}
      Icon={<ArrowRightIcon />}
      onClick={() => getConfirmation()}
      isDisabled={isDisabledByAuthorisation}
    />
  );
};
