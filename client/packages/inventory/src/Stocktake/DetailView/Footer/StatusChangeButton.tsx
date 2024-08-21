import React, { useMemo, useState, useEffect } from 'react';
import { keyBy, mapKeys, mapValues } from '@common/utils';
import {
  ArrowRightIcon,
  useTranslation,
  useNotification,
  SplitButton,
  SplitButtonOption,
  useConfirmationModal,
  StocktakeNodeStatus,
  noOtherVariants,
  getErrorMessage,
} from '@openmsupply-client/common';
import { getNextStocktakeStatus, getStatusTranslation } from '../../../utils';
import { useStocktake } from '../../api';
import { useStocktakeLineErrorContext } from '../../context';

const getStatusOptions = (
  getButtonLabel: (status: StocktakeNodeStatus) => string
): [
  SplitButtonOption<StocktakeNodeStatus>,
  SplitButtonOption<StocktakeNodeStatus>,
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
  const { mutateAsync: save } = useStocktake.document.update();
  const { success, error } = useNotification();
  const t = useTranslation('inventory');

  const errorsContext = useStocktakeLineErrorContext();

  const options = useMemo(
    () => getStatusOptions(getButtonLabel(t)),
    [getButtonLabel]
  );

  const [selectedOption, setSelectedOption] =
    useState<SplitButtonOption<StocktakeNodeStatus> | null>(() =>
      getNextStatusOption(status, options)
    );

  const mapStructuredErrors = (
    result: Awaited<ReturnType<typeof save>>
  ): /* error */ string | /* OK */ undefined => {
    if (result.__typename === 'StocktakeNode') {
      return /* OK */ undefined;
    }

    const { error } = result;

    // General errors
    if (error.__typename === 'CannotEditStocktake')
      return t('error.not-editable');

    if (error.__typename === 'StocktakeIsLocked') return t('error.is-locked');

    // By line errors
    switch (error.__typename) {
      case 'StockLinesReducedBelowZero':
        // StockLinesReducedBelowZero.errors contains an array of StockLineReducedBelowZero which have StockLines
        // we want to match StocktakeLine ids for those errors

        // ids = { stockLineId: stocktakeLineId }
        const ids = mapValues(
          mapKeys(lines.nodes, line => line.stockLine?.id),
          'id'
        );
        // mappedErrors = { stockLineId: StockLineReducedBelowZero }
        const mappedErrors = mapKeys(
          error.errors,
          line => ids[line.stockLine.id]
        );

        errorsContext.setErrors(mappedErrors);
        return t('error.stocktake-has-stock-reduced-below-zero');

      case 'SnapshotCountCurrentCountMismatch':
        const lineId = mapValues(
          keyBy(lines.nodes, lines => lines.id),
          'id'
        );
        const mappedE = mapKeys(
          error.lines,
          line => lineId[line.stocktakeLine.id]
        );
        errorsContext.setErrors(mappedE);

        return t('error.stocktake-snapshot-total-mismatch');

      default:
        noOtherVariants(error);
    }
  };

  const onConfirmStatusChange = async () => {
    if (!selectedOption) return null;

    errorsContext.unsetAll();
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
      error(getErrorMessage(e))();
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
