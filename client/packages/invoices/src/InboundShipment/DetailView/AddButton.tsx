import React, { useState } from 'react';
import { SplitButton, SplitButtonOption } from '@common/components';
import { useTranslation } from '@common/intl';
import { AddFromMasterListButton } from './AddFromMasterListButton';
import { useToggle } from '@common/hooks';

interface AddButtonProps {
  /** Disable the whole control */
  disable: boolean;
  disableAddFromMasterListButton: boolean;
  onAddItem: (newState: boolean) => void;
}

export const AddButton = ({
  disable,
  disableAddFromMasterListButton,

  onAddItem,
}: AddButtonProps) => {
  const t = useTranslation();
  const masterListModalController = useToggle();

  const options: [SplitButtonOption<string>, SplitButtonOption<string>] = [
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
  ];
  const [addItemOption] = options;
  const [selectedOption, setSelectedOption] =
    useState<SplitButtonOption<string>>(addItemOption);

  return (
    <>
      <SplitButton
        color="primary"
        options={options}
        selectedOption={selectedOption}
        onSelectOption={setSelectedOption}
        onClick={() => {
          switch (selectedOption.value) {
            case 'add-item':
              onAddItem(true);
              break;
            case 'add-from-master-list':
              masterListModalController.toggleOn();
              break;
          }
        }}
      />

      {masterListModalController.isOn && (
        <AddFromMasterListButton
          isOn={masterListModalController.isOn}
          toggleOff={masterListModalController.toggleOff}
        />
      )}
    </>
  );
};
