import React, { useEffect, useMemo, useState } from 'react';
import {
  AppBarButtonsPortal,
  Grid,
  ReportContext,
  useDetailPanel,
  useTranslation,
  SplitButton,
  SplitButtonOption,
  useToggle,
  PlusCircleIcon,
} from '@openmsupply-client/common';
import { ReportSelector } from '@openmsupply-client/system';
import { SupplyRequestedQuantityButton } from './SupplyRequestedQuantityButton';
import { AddFromMasterListModal } from './AddFromMasterListModal';
import { useResponse } from '../../api';

interface AppBarButtonProps {
  isDisabled: boolean;
  hasLinkedRequisition: boolean;
  isProgram: boolean;
  onAddItem: () => void;
}

export const AppBarButtonsComponent = ({
  isDisabled,
  hasLinkedRequisition,
  isProgram,
  onAddItem,
}: AppBarButtonProps) => {
  const t = useTranslation();
  const masterListModalController = useToggle();
  const { OpenButton } = useDetailPanel();
  const { data } = useResponse.document.get();
  const disableAddButton = isDisabled || isProgram || hasLinkedRequisition;

  const options: [SplitButtonOption<string>, SplitButtonOption<string>] =
    useMemo(
      () => [
        {
          value: 'add-item',
          label: t('button.add-item'),
          isDisabled: disableAddButton,
        },
        {
          value: 'add-from-master-list',
          label: t('button.add-from-master-list'),
          isDisabled: disableAddButton,
        },
      ],
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [disableAddButton]
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
    }
  };

  const onSelectOption = (option: SplitButtonOption<string>) => {
    setSelectedOption(option);
    handleOptionSelection(option);
  };

  return (
    <AppBarButtonsPortal>
      <Grid container gap={1}>
        <SplitButton
          color="primary"
          options={options}
          selectedOption={selectedOption}
          onSelectOption={onSelectOption}
          onClick={handleOptionSelection}
          isDisabled={disableAddButton}
          openFrom="bottom"
          Icon={<PlusCircleIcon />}
        />

        <SupplyRequestedQuantityButton />
        <ReportSelector
          context={ReportContext.Requisition}
          dataId={data?.id ?? ''}
          queryParams={{ filterBy: { subContext: { equalAnyOrNull: [] } } }}
        />
        {OpenButton}
      </Grid>

      {masterListModalController.isOn && (
        <AddFromMasterListModal
          isOn={masterListModalController.isOn}
          toggleOff={masterListModalController.toggleOff}
        />
      )}
    </AppBarButtonsPortal>
  );
};

export const AppBarButtons = React.memo(AppBarButtonsComponent);
