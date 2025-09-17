import React, { useEffect, useMemo, useState } from 'react';
import { SplitButton, SplitButtonOption } from '@common/components';
import { useTranslation } from '@common/intl';
import { AddFromMasterListButton } from './AddFromMasterListButton';
import { useNotification, useToggle, useUrlQuery } from '@common/hooks';
import { AddFromInternalOrder } from './AddFromInternalOrder';
import { PlusCircleIcon } from '@common/icons';
import { InboundFragment } from '../api';
import { InvoiceNodeStatus } from '@common/types';
import { ScannedBarcode } from '../../types';
import { InboundShipmentDetailTabs } from './types';

interface AddButtonProps {
  requisitionId: string;
  invoice: InboundFragment | undefined;
  onAddItem: (scannedBarcode?: ScannedBarcode) => void;
  onUploadDocument: () => void;
  /** Disable the whole control */
  disable: boolean;
  disableAddFromMasterListButton: boolean;
  disableAddFromInternalOrderButton: boolean;
}

export const AddButton = ({
  requisitionId,
  invoice,
  onAddItem,
  onUploadDocument,
  disable,
  disableAddFromMasterListButton,
  disableAddFromInternalOrderButton,
}: AddButtonProps) => {
  const t = useTranslation();
  const { info } = useNotification();
  const { urlQuery } = useUrlQuery();
  const currentTab = urlQuery['tab'];

  const masterListModalController = useToggle();
  const internalOrderModalController = useToggle();

  const options: [
    SplitButtonOption<string>,
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
        value: 'add-from-internal-order',
        label: t('button.add-from-internal-order'),
        isDisabled: disableAddFromInternalOrderButton || disable,
      },
      {
        value: 'upload-document',
        label: t('label.upload-document'),
        isDisabled: disable,
      },
    ],
    [disable, disableAddFromMasterListButton, disableAddFromInternalOrderButton]
  );

  const [selectedOption, setSelectedOption] = useState<
    SplitButtonOption<string>
  >(options[0]);

  useEffect(() => {
    if (currentTab === InboundShipmentDetailTabs.Documents) {
      // Default to `upload-document` when on Documents tab
      setSelectedOption(options[3]);
    } else {
      setSelectedOption(options[0]);
    }
  }, [options, currentTab]);

  const handleOptionSelection = (option: SplitButtonOption<string>) => {
    switch (option.value) {
      case 'add-item':
        onAddItem();
        break;
      case 'add-from-master-list':
        invoice?.status === InvoiceNodeStatus.New
          ? masterListModalController.toggleOn()
          : info(t('error.cannot-add-from-masterlist'))();
        break;
      case 'add-from-internal-order':
        internalOrderModalController.toggleOn();
      case 'upload-document':
        onUploadDocument();
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
      {internalOrderModalController.isOn && (
        <AddFromInternalOrder
          isOpen={internalOrderModalController.isOn}
          onClose={internalOrderModalController.toggleOff}
          requisitionId={requisitionId}
          invoiceId={invoice?.id ?? ''}
        />
      )}
    </>
  );
};
