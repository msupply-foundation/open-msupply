import React, { useState } from 'react';
import {
  useTranslation,
  InputModal,
  IconButton,
  EditIcon,
  useToggle,
  NumericTextInput,
} from '@openmsupply-client/common';

interface TaxEditProps {
  tax: number;
  onChange: (newTax: number) => void;
  disabled?: boolean;
}

export const TaxEdit = ({ disabled = false, tax, onChange }: TaxEditProps) => {
  const modalController = useToggle();
  const t = useTranslation('replenishment');
  const [val, setVal] = useState<number | undefined>(tax);

  return (
    <>
      <IconButton
        disabled={disabled}
        icon={<EditIcon style={{ fontSize: 12, fill: 'none' }} />}
        label={t('heading.edit-tax-rate')}
        onClick={modalController.toggleOn}
      />
      {/* Unmount when closing to reset state */}
      {modalController.isOn && (
        <InputModal
          isOpen={modalController.isOn}
          onClose={modalController.toggleOff}
          Input={
            <NumericTextInput
              decimalLimit={2}
              max={100}
              value={val ?? 0}
              onChange={setVal}
            />
          }
          onChange={() => onChange(val ?? 0)}
          title={t('heading.edit-tax-rate')}
        />
      )}
    </>
  );
};
