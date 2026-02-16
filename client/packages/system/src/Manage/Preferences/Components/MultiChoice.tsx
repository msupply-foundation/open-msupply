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

type ValidationFunction<T extends string> = (
  newValue: T[],
  changedValue: T,
  isChecking: boolean,
  errorCallback: (message: string) => void
) => boolean;

interface MultiChoice<T extends string> {
  value: T;
  label: string;
  group?: string;
  disabled?: boolean;
  validate?: ValidationFunction<T>;
}

interface MultiChoiceProps<T extends string> {
  options: MultiChoice<T>[];
  value: T[];
  onChange: (newValues: T[]) => void;
  disabled?: boolean;
}

export const MultiChoice = <T extends string>({
  value,
  onChange,
  disabled,
  options,
}: MultiChoiceProps<T>) => {
  const t = useTranslation();
  const { error } = useNotification();

  const handleChange = (option: MultiChoice<T>, isChecking: boolean) => {
    const newValue = isChecking
      ? [...value, option.value]
      : value.filter(v => v !== option.value);

    // Run validation if provided
    if (option.validate) {
      const isValid = option.validate(
        newValue,
        option.value,
        isChecking,
        message => error(t(message as LocaleKey))()
      );
      if (!isValid) {
        return;
      }
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
                  onChange={e => handleChange(option, e.target.checked)}
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
      // Validation function for inbound shipment statuses
      const validateInboundStatus: ValidationFunction<InvoiceNodeStatus> = (
        newValue,
        changedValue,
        isChecking,
        errorCallback
      ) => {
        // Only validate when unchecking Delivered or Received
        if (
          !isChecking &&
          (changedValue === InvoiceNodeStatus.Delivered ||
            changedValue === InvoiceNodeStatus.Received)
        ) {
          const hasDelivered = newValue.includes(InvoiceNodeStatus.Delivered);
          const hasReceived = newValue.includes(InvoiceNodeStatus.Received);

          // Prevent unchecking if it would leave neither status enabled
          if (!hasDelivered && !hasReceived) {
            errorCallback('error.invoice-status-inbound-requires-delivered-or-received');
            return false;
          }
        }
        return true;
      };

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
          // Add validation only for Delivered and Received statuses
          validate:
            status === InvoiceNodeStatus.Delivered ||
            status === InvoiceNodeStatus.Received
              ? validateInboundStatus
              : undefined,
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
