import React from 'react';
import { UseFormRegisterReturn } from 'react-hook-form';
import { ModalInput } from './ModalInput';
import { ModalLabel } from './ModalLabel';
import { ModalRow } from './ModalRow';

interface InputRowProps {
  defaultValue?: unknown;
  inputProps: UseFormRegisterReturn;
  label: string;
}

export const ModalInputRow: React.FC<InputRowProps> = ({
  defaultValue,
  inputProps,
  label,
}) => (
  <ModalRow>
    <ModalLabel label={label} />
    <ModalInput defaultValue={defaultValue} inputProps={inputProps} />
  </ModalRow>
);
