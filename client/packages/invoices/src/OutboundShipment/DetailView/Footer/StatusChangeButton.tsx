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
  const options: [
    SplitButtonOption<InvoiceNodeStatus>,
    SplitButtonOption<InvoiceNodeStatus>,
    SplitButtonOption<InvoiceNodeStatus>,
    SplitButtonOption<InvoiceNodeStatus>,
    SplitButtonOption<InvoiceNodeStatus>,
    SplitButtonOption<InvoiceNodeStatus>
  ] = [
    {
      value: InvoiceNodeStatus.New,
      label: getButtonLabel(InvoiceNodeStatus.New),
      isDisabled: true,
    },
    {
      value: InvoiceNodeStatus.Allocated,
      label: getButtonLabel(InvoiceNodeStatus.Allocated),
      isDisabled: true,
    },
    {
      value: InvoiceNodeStatus.Picked,
      label: getButtonLabel(InvoiceNodeStatus.Picked),
      isDisabled: true,
    },
    {
      value: InvoiceNodeStatus.Shipped,
      label: getButtonLabel(InvoiceNodeStatus.Shipped),
      isDisabled: true,
    },
    {
      value: InvoiceNodeStatus.Delivered,
      label: getButtonLabel(InvoiceNodeStatus.Delivered),
      isDisabled: true,
    },
    {
      value: InvoiceNodeStatus.Verified,
      label: getButtonLabel(InvoiceNodeStatus.Verified),
      isDisabled: true,
    },
  ];

  if (currentStatus === InvoiceNodeStatus.New) {
    options[1].isDisabled = false;
    options[2].isDisabled = false;
    options[3].isDisabled = false;
  }

  if (currentStatus === InvoiceNodeStatus.Allocated) {
    options[2].isDisabled = false;
    options[3].isDisabled = false;
  }

  if (currentStatus === InvoiceNodeStatus.Picked) {
    options[3].isDisabled = false;
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
