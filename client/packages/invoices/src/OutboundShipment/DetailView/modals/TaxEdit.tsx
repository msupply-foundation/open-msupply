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
  update: (newTax: number) => Promise<unknown>;
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
        <InputModal
          isOpen={modalController.isOn}
          onClose={modalController.toggleOff}
          Input={
            <NumericTextInput precision={2} max={100} defaultValue={tax} />
          }
          onChange={value => update(value)}
          title={t('heading.edit-tax-rate')}
        />
      )}
    </>
  );
};
