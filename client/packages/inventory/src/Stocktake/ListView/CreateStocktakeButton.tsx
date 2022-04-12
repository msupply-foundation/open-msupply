import React from 'react';
import { ButtonWithIcon } from '@common/components';
import { PlusCircleIcon } from '@common/icons';
import { useTranslation } from '@common/intl';
import { useToggle } from '@common/hooks';
import { useInsertStocktake } from '../api';
import { StockItemSelectModal } from '@openmsupply-client/system';

export const CreateStocktakeButton: React.FC = () => {
  const t = useTranslation(['distribution', 'common']);
  const { mutate } = useInsertStocktake();
  const modalController = useToggle();

  return (
    <>
      {modalController.isOn && (
        <StockItemSelectModal
          isOpen={modalController.isOn}
          onChange={mutate}
          onClose={modalController.toggleOff}
        />
      )}
      <ButtonWithIcon
        Icon={<PlusCircleIcon />}
        label={t('label.new-stocktake')}
        onClick={modalController.toggleOn}
      />
    </>
  );
};
