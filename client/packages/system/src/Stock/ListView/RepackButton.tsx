import React, { FC } from 'react';
import {
  ButtonWithIcon,
  useTranslation,
  useToggle,
  PlusCircleIcon,
} from '@openmsupply-client/common';
import { StockLineRowFragment } from '../api';
import { RepackModal } from '../Components/Repack/RepackModal';

export const RepackButtonComponent: FC<{
  selected: StockLineRowFragment | null;
}> = ({ selected }) => {
  const t = useTranslation('inventory');
  const modalController = useToggle();

  return (
    <>
      {modalController.isOn && (
        <RepackModal
          isOpen={modalController.isOn}
          onClose={modalController.toggleOff}
          stockLine={selected}
        />
      )}
      <ButtonWithIcon
        disabled={false}
        Icon={<PlusCircleIcon />}
        label={t('button.repack')}
        onClick={modalController.toggleOn}
      />
    </>
  );
};

export const RepackButton = React.memo(RepackButtonComponent);
