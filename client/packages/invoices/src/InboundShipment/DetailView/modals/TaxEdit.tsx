import React from 'react';
import {
  useTranslation,
  NonNegativeNumberInputModal,
  IconButton,
  EditIcon,
  useToggle,
  NumUtils,
} from '@openmsupply-client/common';

interface TaxEditProps {
  tax: number;
  onChange: (newTax: number) => void;
  disabled?: boolean;
}

export const TaxEdit = ({ disabled = false, tax, onChange }: TaxEditProps) => {
  const modalController = useToggle();
  const t = useTranslation('replenishment');

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
        <NonNegativeNumberInputModal
          max={100}
          isOpen={modalController.isOn}
          onClose={modalController.toggleOff}
          onChange={value => onChange(NumUtils.round(value, 2))}
          initialValue={NumUtils.round(tax, 2)}
          title={t('heading.edit-tax-rate')}
        />
      )}
    </>
  );
};
