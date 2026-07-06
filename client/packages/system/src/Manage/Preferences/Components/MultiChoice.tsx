import React, { Fragment } from 'react';
import {
  Box,
  Checkbox,
  GenderTypeNode,
  getGenderTranslationKey,
  InputWithLabelRow,
  InvoiceNodeStatus,
  LocaleKey,
  PreferenceKey,
  TypedTFunction,
  groupBy,
  useNotification,
  useTranslation,
} from '@openmsupply-client/common';
import { getInvoiceStatusTranslator } from '@openmsupply-client/invoices';

interface MultiChoice<T extends string> {
  value: T;
  label: string;
  group?: string;
  disabled?: boolean;
}

interface MultiChoiceProps<T extends string> {
  options: MultiChoice<T>[];
  value: T[];
  onChange: (newValues: T[]) => void;
  disabled?: boolean;
  preferenceKey?: PreferenceKey;
}

export const MultiChoice = <T extends string>({
  value,
  onChange,
  disabled,
  options,
  preferenceKey,
}: MultiChoiceProps<T>) => {
  const t = useTranslation();
  const { error } = useNotification();

  const isInvoiceNodeStatus = (value: string): value is InvoiceNodeStatus => {
    return Object.values(InvoiceNodeStatus).includes(value as InvoiceNodeStatus);
  };

  const validateInvoiceStatusChange = (
    newValue: T[],
    optionValue: T,
    isChecking: boolean
  ): boolean => {
    // Only validate for InvoiceStatusOptions preference
    if (preferenceKey !== PreferenceKey.InvoiceStatusOptions) {
      return true;
    }

    // Type guard to ensure we're working with InvoiceNodeStatus values
    if (!isInvoiceNodeStatus(optionValue)) {
      return true;
    }

    // If unchecking either Delivered or Received
    if (
      !isChecking &&
      (optionValue === InvoiceNodeStatus.Delivered ||
        optionValue === InvoiceNodeStatus.Received)
    ) {
      // Check if this would result in both being unchecked
      const hasDelivered = newValue.some(
        v => isInvoiceNodeStatus(v) && v === InvoiceNodeStatus.Delivered
      );
      const hasReceived = newValue.some(
        v => isInvoiceNodeStatus(v) && v === InvoiceNodeStatus.Received
      );

      // If neither Delivered nor Received would be checked, prevent the change
      if (!hasDelivered && !hasReceived) {
        error(t('error.invoice-status-inbound-requires-delivered-or-received'))();
        return false;
      }
    }

    return true;
  };

  const handleChange = (optionValue: T, isChecking: boolean) => {
    const newValue = isChecking
      ? [...value, optionValue]
      : value.filter(v => v !== optionValue);

    // Validate the change before applying
    if (!validateInvoiceStatusChange(newValue, optionValue, isChecking)) {
      return;
    }

    onChange(newValue);
  };

  const groupedOptions = groupBy(options, option => option.group || '');

  return (
    <Box display="grid" gridTemplateColumns="1fr 1fr" width="100%">
      {Object.entries(groupedOptions).map(([group, groupOptions]) => (
        <Fragment key={group}>
          {group && (
            <Box
              gridColumn="1 / -1"
              sx={{
                fontWeight: 'bold',
                marginTop: 1,
                marginBottom: 0.5,
                fontSize: '0.875rem',
              }}
            >
              {group}
            </Box>
          )}
          {groupOptions.map(option => (
            <InputWithLabelRow
              key={`${option.group}-${option.value}`}
              label={option.label}
              labelRight
              Input={
                <Checkbox
                  disabled={disabled || option.disabled}
                  checked={value.includes(option.value)}
                  onChange={e => handleChange(option.value, e.target.checked)}
                />
              }
              labelWidth={'150px'}
              labelProps={{
                sx: {
                  fontWeight: 'normal',
                },
              }}
              sx={{
                gap: 0.5,
              }}
            />
          ))}
        </Fragment>
      ))}
    </Box>
  );
};

export const getMultiChoiceOptions = (
  t: TypedTFunction<LocaleKey>,
  key: PreferenceKey
) => {
  switch (key) {
    case PreferenceKey.GenderOptions:
      return Object.values(GenderTypeNode)
        .filter(
          gender => !gender.includes('HORMONE') && !gender.includes('SURGICAL')
        )
        .map(gender => ({
          value: gender,
          label: t(getGenderTranslationKey(gender)),
        }));

    case PreferenceKey.InvoiceStatusOptions:
      const options: MultiChoice<InvoiceNodeStatus>[] = [];

      outboundStatuses.forEach(({ status, disabled }) => {
        options.push({
          value: status,
          label: getInvoiceStatusTranslator(t)(status),
          group: `${t('label.outbound-shipment')} / ${t('supplier-return')}`,
          disabled,
        });
      });

      inboundStatuses.forEach(({ status, disabled }) => {
        options.push({
          value: status,
          label: getInvoiceStatusTranslator(t)(status),
          group: `${t('label.inbound-shipment')} / ${t('customer-return')}`,
          disabled,
        });
      });

      return options;

    default:
      return [];
  }
};

const outboundStatuses = [
  { status: InvoiceNodeStatus.New, disabled: true },
  { status: InvoiceNodeStatus.Allocated, disabled: false },
  { status: InvoiceNodeStatus.Picked, disabled: false },
  { status: InvoiceNodeStatus.Shipped, disabled: true },
];

const inboundStatuses = [
  { status: InvoiceNodeStatus.New, disabled: true },
  { status: InvoiceNodeStatus.Delivered, disabled: false },
  { status: InvoiceNodeStatus.Received, disabled: false },
  { status: InvoiceNodeStatus.Verified, disabled: true },
];
