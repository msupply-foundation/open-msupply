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
  PlusCircleIcon,
} from '@openmsupply-client/common';
import {
  getNextRequisitionStatus,
  getStatusTranslation,
  responseStatuses,
} from '../../../utils';
import { ResponseFragment, useResponse } from '../../api';
import { useResponseRequisitionLineErrorContext } from '../../context';
import { useCreateShipment } from './useCreateShipment';

const getStatusOptions = (
  currentStatus: RequisitionNodeStatus,
  getButtonLabel: (status: RequisitionNodeStatus) => string,
  getCreateShipmentLabel: string
): SplitButtonOption<RequisitionNodeStatus | 'create-shipment'>[] => {
  const options: [
    SplitButtonOption<RequisitionNodeStatus>,
    SplitButtonOption<'create-shipment'>,
    SplitButtonOption<RequisitionNodeStatus>,
  ] = [
    {
      value: RequisitionNodeStatus.New,
      label: getButtonLabel(RequisitionNodeStatus.New),
      isDisabled: true,
    },
    {
      value: 'create-shipment',
      label: getCreateShipmentLabel,
      isDisabled: true,
      Icon: <PlusCircleIcon />,
    },
    {
      value: RequisitionNodeStatus.Finalised,
      label: getButtonLabel(RequisitionNodeStatus.Finalised),
      isDisabled: true,
    },
  ];

  if (currentStatus === RequisitionNodeStatus.New) {
    options[1].isDisabled = false;
    options[2].isDisabled = false;
  }

  return options;
};

const getNextStatusOption = (
  status: RequisitionNodeStatus,
  options: SplitButtonOption<RequisitionNodeStatus | 'create-shipment'>[],
  linesFullySupplied: boolean,
  placeholderOrEmpty: boolean
): SplitButtonOption<RequisitionNodeStatus | 'create-shipment'> | null => {
  if (!status) return options[0] ?? null;

  const nextStatus = getNextRequisitionStatus(status, responseStatuses);

  if (status === RequisitionNodeStatus.New) {
    if (placeholderOrEmpty || !linesFullySupplied) {
      return options.find(o => o.value === 'create-shipment') || null;
    }
    if (linesFullySupplied) {
      return (
        options.find(o => o.value === RequisitionNodeStatus.Finalised) || null
      );
    }
  }

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
  const t = useTranslation();
  const { success, error } = useNotification();
  const errorsContext = useResponseRequisitionLineErrorContext();
  const { id, lines, status } = useResponse.document.fields([
    'id',
    'lines',
    'status',
  ]);
  const { mutateAsync: save } = useResponse.document.update();

  const options = useMemo(
    () =>
      getStatusOptions(status, getButtonLabel(t), t('button.create-shipment')),
    [status, t]
  );

  const notFullySuppliedLines = requisition.lines.nodes.filter(
    line => line.remainingQuantityToSupply > 0
  ).length;
  const linesFullySupplied = notFullySuppliedLines === 0;
  const placeholderOrEmpty =
    lines.nodes.length === 0 ||
    lines.nodes.every(line => line.supplyQuantity === 0);

  const [selectedOption, setSelectedOption] = useState<SplitButtonOption<
    RequisitionNodeStatus | 'create-shipment'
  > | null>(() =>
    getNextStatusOption(status, options, linesFullySupplied, placeholderOrEmpty)
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
    if (selectedOption.value === 'create-shipment') return null;

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

  const confirmation =
    notFullySuppliedLines > 0
      ? {
          title: t('heading.confirm-finalise'),
          message: t('messages.confirm-not-fully-supplied', {
            count: notFullySuppliedLines,
          }),
          info: t('info.no-shipment'),
        }
      : {
          title: t('heading.are-you-sure'),
          message: t('messages.confirm-status-as', {
            status:
              selectedOption?.value &&
              selectedOption.value !== 'create-shipment'
                ? getStatusTranslation(selectedOption?.value)
                : '',
          }),
          info: undefined,
        };

  const getFinalisedConfirmation = useConfirmationModal({
    title: confirmation.title,
    message: confirmation.message,
    info: confirmation.info,
    buttonLabel: t('button.continue'),
    onConfirm: onConfirmStatusChange,
  });

  // When the status of the requisition changes (after an update), set the selected option to the next status.
  // Otherwise, it would be set to the current status, which is now a disabled option.
  useEffect(() => {
    setSelectedOption(() =>
      getNextStatusOption(
        status,
        options,
        linesFullySupplied,
        placeholderOrEmpty
      )
    );
  }, [status, options, linesFullySupplied]);

  return {
    options,
    selectedOption,
    setSelectedOption,
    getFinalisedConfirmation,
  };
};

export const StatusChangeButton = ({
  requisition,
}: {
  requisition: ResponseFragment;
}) => {
  const {
    options,
    selectedOption,
    setSelectedOption,
    getFinalisedConfirmation,
  } = useStatusChangeButton(requisition);
  const { onCreateShipment } = useCreateShipment();
  const isDisabled = useResponse.utils.isDisabled();
  const isDisabledByAuthorisation =
    useResponse.utils.isDisabledByAuthorisation();
  if (!selectedOption) return null;
  if (isDisabled && !isDisabledByAuthorisation) return null;

  const handleClick = () => {
    if (selectedOption.value === 'create-shipment') {
      onCreateShipment();
    }
    if (selectedOption.value === RequisitionNodeStatus.Finalised) {
      getFinalisedConfirmation();
    }
  };

  return (
    <SplitButton
      options={options}
      selectedOption={selectedOption}
      onSelectOption={setSelectedOption}
      Icon={<ArrowRightIcon />}
      onClick={handleClick}
      isDisabled={isDisabledByAuthorisation}
    />
  );
};
