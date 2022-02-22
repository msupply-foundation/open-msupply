import React, { useMemo, useState, useEffect } from 'react';
import {
  ArrowRightIcon,
  useTranslation,
  useNotification,
  SplitButton,
  SplitButtonOption,
  useConfirmationModal,
  StocktakeNodeStatus,
} from '@openmsupply-client/common';
import { getNextStocktakeStatus, getStatusTranslation } from '../../../utils';
import { useIsStocktakeDisabled, useStocktakeFields } from '../../api';

const getStatusOptions = (
  getButtonLabel: (status: StocktakeNodeStatus) => string
): [
  SplitButtonOption<StocktakeNodeStatus>,
  SplitButtonOption<StocktakeNodeStatus>
] => {
  return [
    {
      value: StocktakeNodeStatus.New,
      label: getButtonLabel(StocktakeNodeStatus.New),
      isDisabled: true,
    },
    {
      value: StocktakeNodeStatus.Finalised,
      label: getButtonLabel(StocktakeNodeStatus.Finalised),
      isDisabled: false,
    },
  ];
};

const getNextStatusOption = (
  status: StocktakeNodeStatus,
  options: SplitButtonOption<StocktakeNodeStatus>[]
): SplitButtonOption<StocktakeNodeStatus> | null => {
  if (!status) return options[0] ?? null;

  const nextStatus = getNextStocktakeStatus(status);
  const nextStatusOption = options.find(o => o.value === nextStatus);
  return nextStatusOption || null;
};

const getButtonLabel =
  (t: ReturnType<typeof useTranslation>) =>
  (invoiceStatus: StocktakeNodeStatus): string => {
    return t('button.save-and-confirm-status', {
      status: t(getStatusTranslation(invoiceStatus)),
    });
  };

const useStatusChangeButton = () => {
  const { lines, status, update } = useStocktakeFields(['status', 'lines']);
  const { success, error } = useNotification();
  const t = useTranslation('replenishment');

  const options = useMemo(
    () => getStatusOptions(getButtonLabel(t)),
    [getButtonLabel]
  );

  const [selectedOption, setSelectedOption] =
    useState<SplitButtonOption<StocktakeNodeStatus> | null>(() =>
      getNextStatusOption(status, options)
    );

  const onConfirmStatusChange = async () => {
    if (!selectedOption) return null;
    try {
      await update({ status: selectedOption.value });
      success(t('message.saved'))();
    } catch (e) {
      error(t('message.could-not-save'))();
    }
  };

  const onGetConfirmation = useConfirmationModal({
    title: t('heading.are-you-sure'),
    message: t('message.confirm-status-as', {
      status: selectedOption?.value
        ? getStatusTranslation(selectedOption?.value)
        : '',
    }),
    onConfirm: onConfirmStatusChange,
  });

  // When the status of the requisition changes (after an update), set the selected option to the next status.
  // Otherwise, it would be set to the current status, which is now a disabled option.
  useEffect(() => {
    setSelectedOption(() => getNextStatusOption(status, options));
  }, [status, options]);

  return {
    options,
    selectedOption,
    setSelectedOption,
    onGetConfirmation,
    lines,
  };
};

export const StatusChangeButton = () => {
  const {
    options,
    selectedOption,
    setSelectedOption,
    onGetConfirmation,
    lines,
  } = useStatusChangeButton();
  const isDisabled = useIsStocktakeDisabled();

  if (!selectedOption) return null;
  if (isDisabled) return null;

  return (
    <SplitButton
      isDisabled={lines?.totalCount === 0}
      options={options}
      selectedOption={selectedOption}
      onSelectOption={setSelectedOption}
      Icon={<ArrowRightIcon />}
      onClick={onGetConfirmation}
    />
  );
};
