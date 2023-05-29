import React, { FC } from 'react';
import {
  ButtonWithIcon,
  useTranslation,
  useToggle,
  PlusCircleIcon,
} from '@openmsupply-client/common';
import { StockLineEditModal } from '../Components';
import { StockLineRowFragment } from '../api';

export const EditStockLineButtonComponent: FC<{
  selected: StockLineRowFragment | null;
}> = ({ selected }) => {
  const t = useTranslation('inventory');
  const modalController = useToggle();

  return (
    <>
      {modalController.isOn && (
        <StockLineEditModal
          isOpen={modalController.isOn}
          onClose={modalController.toggleOff}
          stockLine={selected}
        />
      )}
      <ButtonWithIcon
        disabled={false}
        Icon={<PlusCircleIcon />}
        label={t('button.edit-stock-line')}
        onClick={modalController.toggleOn}
      />
    </>
  );
};

export const EditStockLineButton = React.memo(EditStockLineButtonComponent);
