import React, { FC } from 'react';
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
  currencyRate?: number;
}

export const CurrencyModal: FC<CurrencyModalProps> = ({
  currency,
  onChange,
  isDisabled,
  currencyRate,
}) => {
  const t = useTranslation();
  const modalController = useToggle();
  const [value, setValue] = React.useState(currency);

  const onClose = () => {
    modalController.toggleOff();
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
          <CurrencySearchInput
            value={value}
            width={100}
            onChange={setValue}
            currencyRate={currencyRate}
          />
        }
      />
    </>
  );
};
