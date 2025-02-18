import React, { useState } from 'react';
import { SplitButton, SplitButtonOption } from '@common/components';
import { useTranslation } from '@common/intl';
import { AddFromMasterListButton } from './AddFromMasterListButton';
import { useToggle } from '@common/hooks';
import { AddFromInternalOrder } from './AddFromInternalOrder';

interface AddButtonProps {
  requisitionId: string;
  invoiceId: string;
  onAddItem: (newState: boolean) => void;
  /** Disable the whole control */
  disable: boolean;
  disableAddFromMasterListButton: boolean;
  disableAddFromInternalOrderButton: boolean;
}

export const AddButton = ({
  requisitionId,
  invoiceId,
  onAddItem,
  disable,
  disableAddFromMasterListButton,
  disableAddFromInternalOrderButton,
}: AddButtonProps) => {
  const t = useTranslation();
  const masterListModalController = useToggle();
  const internalOrderModalController = useToggle();

  const options: [
    SplitButtonOption<string>,
    SplitButtonOption<string>,
    SplitButtonOption<string>,
  ] = [
    {
      value: 'add-item',
      label: t('button.add-item'),
      isDisabled: disable,
    },
    {
      value: 'add-from-master-list',
      label: t('button.add-from-master-list'),
      isDisabled: disableAddFromMasterListButton || disable,
    },
    {
      value: 'add-from-internal-order',
      label: t('button.add-from-internal-order'),
      isDisabled: disableAddFromInternalOrderButton || disable,
    },
  ];
  const [addItemOption] = options;
  const [selectedOption, setSelectedOption] =
    useState<SplitButtonOption<string>>(addItemOption);

  const handleOptionSelection = (option: SplitButtonOption<string>) => {
    switch (option.value) {
      case 'add-item':
        onAddItem(true);
        break;
      case 'add-from-master-list':
        masterListModalController.toggleOn();
        break;
      case 'add-from-internal-order':
        internalOrderModalController.toggleOn();
        break;
    }
  };

  const onSelectOption = (option: SplitButtonOption<string>) => {
    setSelectedOption(option);
    handleOptionSelection(option);
  };

  return (
    <>
      <SplitButton
        color="primary"
        options={options}
        selectedOption={selectedOption}
        onSelectOption={onSelectOption}
        onClick={handleOptionSelection}
        isDisabled={disable}
        openFrom="bottom"
      />

      {masterListModalController.isOn && (
        <AddFromMasterListButton
          isOn={masterListModalController.isOn}
          toggleOff={masterListModalController.toggleOff}
        />
      )}
      {internalOrderModalController.isOn && (
        <AddFromInternalOrder
          isOpen={internalOrderModalController.isOn}
          onClose={internalOrderModalController.toggleOff}
          requisitionId={requisitionId}
          invoiceId={invoiceId}
        />
      )}
    </>
  );
};
