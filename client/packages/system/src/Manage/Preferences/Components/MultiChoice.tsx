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
}

export const MultiChoice = <T extends string>({
  value,
  onChange,
  disabled,
  options,
}: MultiChoiceProps<T>) => {
  const handleChange = (optionValue: T, checked: boolean) => {
    const newValue = checked
      ? [...value, optionValue]
      : value.filter(v => v !== optionValue);
    onChange(newValue);
  };

  const groupedOptions = options.reduce(
    (i, option) => {
      const group = option.group || '';
      if (!i[group]) i[group] = [];
      i[group].push(option);
      return i;
    },
    {} as Record<string, MultiChoice<T>[]>
  );

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
          group: t('label.outbound-shipment'),
          disabled,
        });
      });

      inboundStatuses.forEach(({ status, disabled }) => {
        options.push({
          value: status,
          label: getInvoiceStatusTranslator(t)(status),
          group: t('label.inbound-shipment'),
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
