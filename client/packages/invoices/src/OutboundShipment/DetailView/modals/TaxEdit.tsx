import React from 'react';
import {
  useTranslation,
  NonNegativeNumberInputModal,
  IconButton,
  EditIcon,
  useToggle,
} from '@openmsupply-client/common';
import { useUpdateOutboundTax } from '../../api';

export const TaxEdit = ({ tax }: { tax: number }) => {
  const { mutate } = useUpdateOutboundTax();
  const modalController = useToggle();
  const t = useTranslation('distribution');

  return (
    <>
      <IconButton
        icon={<EditIcon style={{ fontSize: 12, fill: 'none' }} />}
        label={t('heading.edit-tax-rate')}
        onClick={modalController.toggleOn}
      />

      {modalController.isOn && (
        <NonNegativeNumberInputModal
          isOpen={modalController.isOn}
          onClose={modalController.toggleOff}
          onChange={newValue => mutate(newValue)}
          initialValue={tax}
          title={t('heading.edit-tax-rate')}
        />
      )}
    </>
  );
};
