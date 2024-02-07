import React, { FC, useEffect } from 'react';
import {
  EditIcon,
  IconButton,
  InputModal,
  useToggle,
  useTranslation,
} from '@openmsupply-client/common';
import { CurrencyRowFragment } from '../api';
import { CurrencySearchInput } from './CurrencySearchInput';

interface CurrencyModalProps {
  currency: CurrencyRowFragment | null;
  onChange: (currency: CurrencyRowFragment | null) => void;
  isDisabled?: boolean;
}

export const CurrencyModal: FC<CurrencyModalProps> = ({
  currency,
  onChange,
  isDisabled,
}) => {
  const t = useTranslation();
  const modalController = useToggle();
  const [value, setValue] = React.useState(currency);

  useEffect(() => {
    setValue(currency);
  }, [currency]);

  const onClose = () => {
    modalController.toggleOff();
    setValue(currency);
  };

  return (
    <>
      <IconButton
        disabled={isDisabled}
        icon={<EditIcon style={{ fontSize: 16, fill: 'none' }} />}
        label={t('label.change-currency')}
        onClick={modalController.toggleOn}
      />
      <InputModal
        title={t('heading.foreign-currency')}
        isOpen={modalController.isOn}
        onClose={onClose}
        onChange={() => onChange(value)}
        Input={
          <CurrencySearchInput value={value} width={75} onChange={setValue} />
        }
      />
    </>
  );
};
