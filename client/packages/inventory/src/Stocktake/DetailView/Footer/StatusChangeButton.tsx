import React, { useMemo, useState, useEffect } from 'react';
import {
  ArrowRightIcon,
  useTranslation,
  useNotification,
  SplitButton,
  SplitButtonOption,
  useConfirmationModal,
  StocktakeNodeStatus,
  noOtherVariants,
} from '@openmsupply-client/common';
import { getNextStocktakeStatus, getStatusTranslation } from '../../../utils';
import { useStocktake } from '../../api';
import { errorMessage } from '../modal/StocktakeLineEdit/hooks';
import {
  StocktakeLineError,
  useStocktakeLineErrorContext,
} from '../../context';

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
  const { id, lines, status } = useStocktake.document.fields([
    'id',
    'status',
    'lines',
  ]);
  const { mutateAsync } = useStocktake.document.update();
  const { success, error: errorNotification } = useNotification();
  const t = useTranslation(['replenishment', 'inventory']);

  const errors = useStocktakeLineErrorContext();

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

    errors.unsetAll();
    let result;
    try {
      result = await mutateAsync({ id, status: selectedOption.value });
    } catch (e) {
      return errorNotification(errorMessage(e))();
    }

    if (result.__typename === 'StocktakeNode') {
      return success(t('messages.saved'))();
    }

    const { error } = result;

    // General errors
    if (error.__typename === 'CannotEditStocktake') {
      return errorNotification(t('error.not-editable'))();
    }

    if (error.__typename === 'StocktakeIsLocked') {
      return errorNotification(t('error.is-locked'))();
    }

    let stocktakeLineIdsWithErrors: {
      [stocktakeLineId: string]: StocktakeLineError;
    } = {};
    // By line errors
    switch (error.__typename) {
      case 'StockLinesReducedBelowZero':
        // StockLinesReducedBelowZero.errors contains an array of StockLineReducedBelowZero which have StockLines
        // we want to match StocktakeLine ids for those errors
        stocktakeLineIdsWithErrors = error.errors.reduce((acc, innerError) => {
          const stocktakeLine = lines.nodes.find(
            line => line.stockLine?.id === innerError.stockLine.id
          );
          if (!stocktakeLine) return acc;
          return { ...acc, [stocktakeLine.id]: innerError };
        }, stocktakeLineIdsWithErrors);

        errors.setErrors(stocktakeLineIdsWithErrors);
        return errorNotification(
          t('error.stocktake-has-stock-reduced-below-zero')
        )();
      case 'SnapshotCountCurrentCountMismatch':
        stocktakeLineIdsWithErrors = error.lines.nodes.reduce(
          (acc, innerError) => ({ ...acc, [innerError.id]: error }),
          stocktakeLineIdsWithErrors
        );
        errors.setErrors(stocktakeLineIdsWithErrors);

        return errorNotification(t('error.snapshot-total-mismatch'))();

      default:
        noOtherVariants(error);
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

  // When the status of the requisition changes (after an update), set the selected option to the next status.
  // Otherwise, it would be set to the current status, which is now a disabled option.
  useEffect(() => {
    setSelectedOption(() => getNextStatusOption(status, options));
  }, [status, options]);

  return {
    options,
    selectedOption,
    setSelectedOption,
    getConfirmation,
    lines,
  };
};

export const StatusChangeButton = () => {
  const { options, selectedOption, setSelectedOption, getConfirmation, lines } =
    useStatusChangeButton();
  const isDisabled = useStocktake.utils.isDisabled();

  if (!selectedOption) return null;
  if (isDisabled) return null;

  return (
    <SplitButton
      isDisabled={lines?.totalCount === 0}
      options={options}
      selectedOption={selectedOption}
      onSelectOption={setSelectedOption}
      Icon={<ArrowRightIcon />}
      onClick={() => getConfirmation()}
    />
  );
};
