import React, { useEffect, useMemo, useState } from 'react';
import { SplitButton, SplitButtonOption } from '@common/components';
import { useTranslation } from '@common/intl';
import { AddFromMasterListButton } from './AddFromMasterListButton';
import { useToggle } from '@common/hooks';
import { PlusCircleIcon } from '@common/icons';
import { PurchaseOrderFragment } from '../../api';
import { PurchaseOrderNodeStatus } from '@common/types';
import { AddDocumentModal } from './AddDocumentModal';

interface AddButtonProps {
  onAddItem: () => void;
  /** Disable the whole control */
  disable: boolean;
  disableAddFromMasterListButton: boolean;
  disableAddFromInternalOrderButton: boolean;
}

export const AddButton = ({
  onAddItem,
  disable,
  disableAddFromMasterListButton,
}: AddButtonProps) => {
  const t = useTranslation();
  const masterListModalController = useToggle();
  const uploadDocumentController = useToggle();

  const options: [
    SplitButtonOption<string>,
    SplitButtonOption<string>,
    SplitButtonOption<string>,
  ] = useMemo(
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
      {
        value: 'upload-document',
        label: t('label.upload-document'),
      },
    ],
    [disable, disableAddFromMasterListButton, t]
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
        masterListModalController.toggleOn();
        break;
      case 'upload-document':
        uploadDocumentController.toggleOn();
        break;
      case 'upload-document':
        uploadDocumentController.toggleOn();
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
      {uploadDocumentController.isOn && (
        <AddDocumentModal
          isOn={uploadDocumentController.isOn}
          toggleOff={uploadDocumentController.toggleOff}
          purchaseOrderId={purchaseOrder?.id}
        />
      )}
    </>
  );
};
