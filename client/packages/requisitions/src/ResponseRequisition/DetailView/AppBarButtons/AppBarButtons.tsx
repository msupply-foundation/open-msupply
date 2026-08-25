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
          testId="add-item-button"
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
          testId="export-or-print-button"
          context={ReportContext.Requisition}
          dataId={data?.id ?? ''}
          queryParams={{ filterBy: { subContext: { equalAnyOrNull: [] } } }}
          // Sent for every program requisition, not just one showing the
          // indicators tab: a report declaring $programId / $periodId /
          // $customerNameId fails outright when they are absent from the
          // arguments, so tying them to a display gate could only break such a
          // report (#12713). Sending null instead is not an option — the
          // indicator value fields take String! arguments and reject it.
          extraArguments={
            data?.program?.id && data?.period?.id && data?.otherPartyId
              ? {
                  periodId: data.period.id,
                  programId: data.program.id,
                  customerNameId: data.otherPartyId,
                }
              : undefined
          }
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
