import React, { useEffect, useMemo, useState } from 'react';
import {
  useTranslation,
  SplitButton,
  SplitButtonOption,
  useNotification,
  useToggle,
  PlusCircleIcon,
  RequisitionNodeStatus,
} from '@openmsupply-client/common';
import { AddFromMasterListModal } from './AddFromMasterListModal';

interface AddButtonProps {
  status?: RequisitionNodeStatus;
  onAddItem: (newState: boolean) => void;
  disable: boolean /** Disable the whole control */;
}

export const AddButton = ({ status, onAddItem, disable }: AddButtonProps) => {
  const t = useTranslation();
  const { info } = useNotification();
  const masterListModalController = useToggle();

  const options: [SplitButtonOption<string>, SplitButtonOption<string>] =
    useMemo(
      () => [
        {
          value: 'add-item',
          label: t('button.add-item'),
          isDisabled: disable,
        },
        {
          value: 'add-from-master-list',
          label: t('button.add-from-master-list'),
          isDisabled: disable,
        },
      ],
      [disable]
    );

  const [selectedOption, setSelectedOption] = useState<
    SplitButtonOption<string>
  >(options[0]);

  useEffect(() => {
    setSelectedOption(options[0]);
  }, [options]);

  const handleOptionSelection = (option: SplitButtonOption<string>) => {
    switch (option.value) {
      case 'add-item':
        onAddItem(true);
        break;
      case 'add-from-master-list':
        status === RequisitionNodeStatus.Draft
          ? masterListModalController.toggleOn()
          : info(t('error.cannot-add-from-masterlist'))();
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
        Icon={<PlusCircleIcon />}
      />

      {masterListModalController.isOn && (
        <AddFromMasterListModal
          isOn={masterListModalController.isOn}
          toggleOff={masterListModalController.toggleOff}
        />
      )}
    </>
  );
};
