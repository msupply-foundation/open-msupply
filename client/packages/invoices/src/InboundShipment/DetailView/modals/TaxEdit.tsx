import React from 'react';
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
            <NumericTextInput max={100} precision={2} defaultValue={tax} />
          }
          onChange={value => onChange(value as number)}
          title={t('heading.edit-tax-rate')}
        />
      )}
    </>
  );
};
