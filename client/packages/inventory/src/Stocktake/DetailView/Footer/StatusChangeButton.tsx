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
  getErrorMessage,
  useDisabledNotificationToast,
} from '@openmsupply-client/common';
import { getNextStocktakeStatus, getStatusTranslation } from '../../../utils';
import { useStocktakeOld } from '../../api';
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
  const { id, lines, status } = useStocktakeOld.document.fields([
    'id',
    'status',
    'lines',
  ]);
  const { mutateAsync: save } = useStocktakeOld.document.update();
  const { success, error } = useNotification();
  const t = useTranslation();

  const errorsContext = useStocktakeLineErrorContext();

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

    errorsContext.unsetAll();
    try {
      const result = await save({ id, status: selectedOption.value });

      if (result.__typename === 'StocktakeNode') {
        success(t('messages.saved'))();
        return;
      }

      const { error: structured } = result;

      if (structured.__typename === 'CannotEditStocktake') {
        errorsContext.setStocktakeErrors([t('error.not-editable')]);
        errorsContext.openModal();
        return;
      }
      if (structured.__typename === 'StocktakeIsLocked') {
        errorsContext.setStocktakeErrors([t('error.is-locked')]);
        errorsContext.openModal();
        return;
      }

      switch (structured.__typename) {
        case 'StockLinesReducedBelowZero': {
          const stocktakeLineIdByStockLineId = new Map<string, string>();
          for (const l of lines.nodes) {
            if (l.stockLine?.id)
              stocktakeLineIdByStockLineId.set(l.stockLine.id, l.id);
          }
          errorsContext.setErrors(
            Object.fromEntries(
              structured.errors.map(e => [
                stocktakeLineIdByStockLineId.get(e.stockLine.id) ??
                e.stockLine.id,
                e,
              ])
            )
          );
          break;
        }
        case 'SnapshotCountCurrentCountMismatch': {
          errorsContext.setErrors(
            Object.fromEntries(
              structured.lines.map(e => [e.stocktakeLine.id, e])
            )
          );
          break;
        }
        default:
          noOtherVariants(structured);
      }
      errorsContext.openModal();
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
  const isDisabled = useStocktakeOld.utils.isDisabled();
  const t = useTranslation();
  const noLines =
    lines?.totalCount === 0 ||
    lines?.nodes?.every(l => l.countedNumberOfPacks === null);

  const noLinesNotification = useDisabledNotificationToast(
    t('messages.no-lines')
  );

  if (!selectedOption) return null;
  if (isDisabled) return null;

  const onStatusClick = () => {
    if (noLines) return noLinesNotification();
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
