import React, { useState, useEffect } from 'react';
import {
  ArrowRightIcon,
  useTranslation,
  useNotification,
  InvoiceNodeStatus,
  SplitButton,
  SplitButtonOption,
} from '@openmsupply-client/common';
import { getNextOutboundStatus, getStatusTranslation } from '../../../utils';
import { useIsOutboundDisabled, useOutboundFields } from '../../api';

const getStatusOptions = (
  currentStatus: InvoiceNodeStatus,
  getButtonLabel: (status: InvoiceNodeStatus) => string
): SplitButtonOption<InvoiceNodeStatus>[] => {
  const options: SplitButtonOption<InvoiceNodeStatus>[] = [];

  // If the status is "New", "Allocated" or "Picked" then add
  // shipped to the set of options.
  if (
    currentStatus === InvoiceNodeStatus.New ||
    currentStatus === InvoiceNodeStatus.Allocated ||
    currentStatus === InvoiceNodeStatus.Picked
  ) {
    const value = InvoiceNodeStatus.Shipped;
    const label = getButtonLabel(value);
    options.push({ value, label });
  }

  // If the status is "New" or "Allocated" then add picked to the set of options.
  if (
    currentStatus === InvoiceNodeStatus.New ||
    currentStatus === InvoiceNodeStatus.Allocated
  ) {
    const value = InvoiceNodeStatus.Picked;
    const label = getButtonLabel(value);
    options.push({ value, label });
  }

  // If the status is "New" then add "Allocated" to the set of options.
  if (currentStatus === InvoiceNodeStatus.New) {
    const value = InvoiceNodeStatus.Allocated;
    const label = getButtonLabel(value);
    options.push({ value, label });
  }

  return options;
};

export const StatusChangeButton = () => {
  const { success } = useNotification();
  const isDisabled = useIsOutboundDisabled();
  const { status, update } = useOutboundFields('status');
  const t = useTranslation('distribution');

  const getButtonLabel = (invoiceStatus: InvoiceNodeStatus): string => {
    return t('button.save-and-confirm-status', {
      status: t(getStatusTranslation(invoiceStatus)),
    });
  };

  const options = getStatusOptions(status, getButtonLabel);

  const getNextStatusOption =
    (): SplitButtonOption<InvoiceNodeStatus> | null => {
      if (!status) return options[0] ?? null;

      const nextStatus = getNextOutboundStatus(status);
      const nextStatusOption = options.find(o => o.value === nextStatus);
      return nextStatusOption || null;
    };

  const [selectedOption, setSelectedOption] =
    useState<SplitButtonOption<InvoiceNodeStatus> | null>(getNextStatusOption);

  useEffect(() => {
    setSelectedOption(getNextStatusOption);
  }, [status]);

  if (!selectedOption) return null;
  if (isDisabled) return null;

  return (
    <SplitButton
      options={options}
      selectedOption={selectedOption}
      onSelectOption={setSelectedOption}
      Icon={<ArrowRightIcon />}
      onClick={async ({ value }) => {
        if (!value) return;

        await update({ status: value });
        success('Saved invoice! 🥳 ')();
      }}
    />
  );
};
