import React from 'react';
import { UseFormRegisterReturn } from 'react-hook-form';
import { LocaleKey } from '../../../intl/intlHelpers';
import { ModalInput } from './ModalInput';
import { ModalLabel } from './ModalLabel';
import { ModalRow } from './ModalRow';

interface InputRowProps {
  appendedText?: string;
  defaultValue?: unknown;
  inputProps: UseFormRegisterReturn;
  labelKey: LocaleKey;
}

export const ModalInputRow: React.FC<InputRowProps> = ({
  appendedText,
  defaultValue,
  inputProps,
  labelKey,
}) => (
  <ModalRow>
    <ModalLabel labelKey={labelKey} />
    <ModalInput
      defaultValue={defaultValue}
      inputProps={inputProps}
      appendedText={appendedText}
    />
  </ModalRow>
);
