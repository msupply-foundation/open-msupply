import React from 'react';
import { ButtonWithIcon } from '@common/components';
import { PlusCircleIcon } from '@common/icons';
import { useTranslation } from '@common/intl';
import { useToggle } from '@common/hooks';
import { useInsertStocktake } from '../api';
import { StockItemSelectModal } from 'packages/system/src';

export const CreateStocktakeButton: React.FC = () => {
  const t = useTranslation(['distribution', 'common']);
  const { mutateAsync } = useInsertStocktake();
  const modalController = useToggle();

  return (
    <>
      {modalController.isOn && (
        <StockItemSelectModal
          isOpen={modalController.isOn}
          onChange={mutateAsync}
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
