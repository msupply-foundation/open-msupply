import React, { useEffect, useMemo, useState } from 'react';
import { SplitButton, SplitButtonOption } from '@common/components';
import { useTranslation } from '@common/intl';
import { AddFromMasterListButton } from './AddFromMasterListButton';
import { useNotification, useToggle } from '@common/hooks';
import { PlusCircleIcon } from '@common/icons';
import { PurchaseOrderFragment } from '../../api';
import { PurchaseOrderNodeStatus } from '@common/types';

interface AddButtonProps {
  purchaseOrder: PurchaseOrderFragment | undefined;
  onAddItem: () => void;
  /** Disable the whole control */
  disable: boolean;
  disableAddFromMasterListButton: boolean;
  disableAddFromInternalOrderButton: boolean;
}

export const AddButton = ({
  purchaseOrder,
  onAddItem,
  disable,
  disableAddFromMasterListButton,
}: AddButtonProps) => {
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
          isDisabled: disableAddFromMasterListButton || disable,
        },
      ],
      [disable, disableAddFromMasterListButton]
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
        onAddItem();
        break;
      case 'add-from-master-list':
        // Mimmicking OG behaviour where purchase orders can be edited when confirmed AND when authorised
        purchaseOrder?.status !== PurchaseOrderNodeStatus.Finalised
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
        <AddFromMasterListButton
          isOn={masterListModalController.isOn}
          toggleOff={masterListModalController.toggleOff}
        />
      )}
    </>
  );
};
