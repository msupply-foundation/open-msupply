import React from 'react';
import { UseFormRegisterReturn } from 'react-hook-form';
import { LocaleKey } from '../../../intl/intlHelpers';
import { ModalInput } from './ModalInput';
import { ModalLabel } from './ModalLabel';
import { ModalRow } from './ModalRow';

interface InputRowProps {
  appendix?: React.ReactNode;
  defaultValue?: unknown;
  inputProps: UseFormRegisterReturn;
  labelKey: LocaleKey;
}

export const ModalInputRow: React.FC<InputRowProps> = ({
  appendix,
  defaultValue,
  inputProps,
  labelKey,
}) => (
  <ModalRow>
    <ModalLabel labelKey={labelKey} />
    <ModalInput
      defaultValue={defaultValue}
      inputProps={inputProps}
      appendix={appendix}
    />
  </ModalRow>
);
