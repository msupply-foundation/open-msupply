import React, { useState } from 'react';
import { InputModal } from './InputModal';
import { NonNegativeNumberInput } from '../../inputs';

interface NonNegativeNumberInputModalProps {
  onChange: ((num: number) => Promise<void>) | ((num: number) => void);
  isOpen: boolean;
  onClose: () => void;
  title: string;
  initialValue: number;
  max?: number;
}

export const NonNegativeNumberInputModal = ({
  onChange,
  isOpen,
  onClose,
  title,
  initialValue,
  max,
}: NonNegativeNumberInputModalProps) => {
  const [val, setVal] = useState(initialValue);

  return (
    <InputModal
      title={title}
      isOpen={isOpen}
      onClose={onClose}
      onChange={() => onChange(val)}
      Input={
        <NonNegativeNumberInput
          autoFocus
          value={val}
          onChange={setVal}
          max={max}
        />
      }
    />
  );
};
