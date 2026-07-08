import React, { useMemo, useState, useEffect } from 'react';
import {
  ArrowRightIcon,
  useTranslation,
  useNotification,
  SplitButton,
  SplitButtonOption,
  useConfirmationModal,
  StockRelocationNodeStatus,
  useDisabledNotificationToast,
} from '@openmsupply-client/common';
import {
  getNextStockMovementStatus,
  getStatusTranslation,
  isStockMovementDisabled,
} from '../../utils';
import { StockMovementFragment, useUpdateStockMovement } from '../../api';

const getStatusOptions = (
  getButtonLabel: (status: StockRelocationNodeStatus) => string
): SplitButtonOption<StockRelocationNodeStatus>[] => [
    {
      value: StockRelocationNodeStatus.New,
      label: getButtonLabel(StockRelocationNodeStatus.New),
      isDisabled: true,
    },
    {
      value: StockRelocationNodeStatus.Confirmed,
      label: getButtonLabel(StockRelocationNodeStatus.Confirmed),
      isDisabled: false,
    },
    {
      value: StockRelocationNodeStatus.Finalised,
      label: getButtonLabel(StockRelocationNodeStatus.Finalised),
      isDisabled: false,
    },
  ];

const getNextStatusOption = (
  status: StockRelocationNodeStatus,
  options: SplitButtonOption<StockRelocationNodeStatus>[]
): SplitButtonOption<StockRelocationNodeStatus> | null => {
  if (!status) return options[0] ?? null;
  const nextStatus = getNextStockMovementStatus(status);
  return options.find(o => o.value === nextStatus) ?? null;
};

interface StatusChangeButtonProps {
  movement: StockMovementFragment;
}

export const StatusChangeButton = ({ movement }: StatusChangeButtonProps) => {
  const t = useTranslation();
  const { success, error } = useNotification();
  const { update } = useUpdateStockMovement();

  const getButtonLabel = (status: StockRelocationNodeStatus) =>
    t('button.save-and-confirm-status', {
      status: getStatusTranslation(status, t),
    });

  const options = useMemo(
    () => getStatusOptions(getButtonLabel),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t]
  );

  const [selectedOption, setSelectedOption] =
    useState<SplitButtonOption<StockRelocationNodeStatus> | null>(() =>
      getNextStatusOption(movement.status, options)
    );

  useEffect(() => {
    setSelectedOption(getNextStatusOption(movement.status, options));
  }, [movement.status, options]);

  const onConfirmStatusChange = async () => {
    if (!selectedOption) return;
    try {
      const result = await update({
        id: movement.id,
        status: selectedOption.value,
      });
      if (result.__typename === 'StockRelocationNode') {
        success(t('messages.saved'))();
        return;
      }
      error(result.error.description)();
    } catch (e) {
      error((e as Error).message)();
    }
  };

  const getConfirmation = useConfirmationModal({
    title: t('heading.are-you-sure'),
    message: t('messages.confirm-status-as', {
      status: selectedOption?.value
        ? getStatusTranslation(selectedOption.value, t)
        : '',
    }),
    onConfirm: onConfirmStatusChange,
  });

  const noLinesNotification = useDisabledNotificationToast(
    t('messages.no-lines')
  );

  if (!selectedOption) return null;
  if (isStockMovementDisabled(movement.status)) return null;

  const onStatusClick = () => {
    if (movement.lineCount === 0) return noLinesNotification();
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
