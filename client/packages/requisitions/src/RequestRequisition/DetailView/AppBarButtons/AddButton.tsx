import React, { useEffect, useMemo, useState } from 'react';
import {
  useTranslation,
  SplitButton,
  SplitButtonOption,
  useNotification,
  useToggle,
  PlusCircleIcon,
  RequisitionNodeStatus,
  useUrlQuery,
} from '@openmsupply-client/common';
import { AddFromMasterListModal } from './AddFromMasterListModal';
import { InternalOrderDetailTabs } from '../types';

interface AddButtonProps {
  status?: RequisitionNodeStatus;
  onAddItem: (newState: boolean) => void;
  openUploadModal: () => void;
  disableAddItem?: boolean;
  disableUploadDocument?: boolean;
}

export const AddButton = ({
  status,
  onAddItem,
  openUploadModal,
  disableAddItem,
  disableUploadDocument,
}: AddButtonProps) => {
  const t = useTranslation();
  const { info } = useNotification();
  const masterListModalController = useToggle();
  const currentTab = useUrlQuery().urlQuery['tab'];

  const options: [
    SplitButtonOption<string>,
    SplitButtonOption<string>,
    SplitButtonOption<string>,
  ] = useMemo(
    () => [
      {
        value: 'add-item',
        label: t('button.add-item'),
        isDisabled: disableAddItem,
      },
      {
        value: 'add-from-master-list',
        label: t('button.add-from-master-list'),
        isDisabled: disableAddItem,
      },
      {
        value: 'upload-document',
        label: t('label.upload-document'),
        isDisabled: disableUploadDocument,
      },
    ],
    [disableAddItem, disableUploadDocument, t]
  );

  const [selectedOption, setSelectedOption] = useState<
    SplitButtonOption<string>
  >(options[0]);

  useEffect(() => {
    if (currentTab === InternalOrderDetailTabs.Documents) {
      setSelectedOption(options[2]); // Default to 'upload-document' when not on Documents tab
      return;
    }
    setSelectedOption(options[0]);
  }, [options, currentTab]);

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
      case 'upload-document':
        openUploadModal();
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
        isDisabled={disableAddItem && disableUploadDocument}
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
