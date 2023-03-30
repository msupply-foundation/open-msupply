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
  update: (newTax: number) => Promise<any>;
  disabled?: boolean;
}

export const TaxEdit = ({ disabled = false, tax, update }: TaxEditProps) => {
  const modalController = useToggle();
  const t = useTranslation('distribution');

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
          onChange={value => update(NumUtils.round(value, 2))}
          initialValue={NumUtils.round(tax, 2)}
          title={t('heading.edit-tax-rate')}
        />
      )}
    </>
  );
};
