import React, { FC } from 'react';
import {
  AppBarButtonsPortal,
  ButtonWithIcon,
  PlusCircleIcon,
  Grid,
  useDetailPanel,
  useTranslation,
  useToggle,
  PrinterIcon,
  LoadingButton,
  ReportCategory,
} from '@openmsupply-client/common';
import {
  MasterListSearchModal,
  ReportRowFragment,
  ReportSelector,
  usePrintReport,
} from '@openmsupply-client/system';
import { useAddFromMasterList, useRequest } from '../../api';
import { UseSuggestedQuantityButton } from './UseSuggestedQuantityButton';

interface AppBarButtonProps {
  isDisabled: boolean;
  onAddItem: (newState: boolean) => void;
}

export const AppBarButtonsComponent: FC<AppBarButtonProps> = ({
  isDisabled,
  onAddItem,
}) => {
  const { addFromMasterList } = useAddFromMasterList();
  const { OpenButton } = useDetailPanel();
  const t = useTranslation('distribution');
  const modalController = useToggle();
  const { data } = useRequest();
  const { print, isPrinting } = usePrintReport();

  const printReport = (report: ReportRowFragment) => {
    if (!data) return;
    print({ reportId: report.id, dataId: data?.id || '' });
  };

  return (
    <AppBarButtonsPortal>
      <Grid container gap={1}>
        <UseSuggestedQuantityButton />
        <ButtonWithIcon
          disabled={isDisabled}
          Icon={<PlusCircleIcon />}
          label={t('button.add-from-master-list')}
          onClick={modalController.toggleOn}
        />
        <MasterListSearchModal
          open={modalController.isOn}
          onClose={modalController.toggleOff}
          onChange={masterList => {
            modalController.toggleOff();
            addFromMasterList(masterList);
          }}
        />
        <ButtonWithIcon
          disabled={isDisabled}
          label={t('button.add-item')}
          Icon={<PlusCircleIcon />}
          onClick={() => onAddItem(true)}
        />
        <ReportSelector
          category={ReportCategory.Requisition}
          onClick={printReport}
        >
          <LoadingButton
            variant="outlined"
            startIcon={<PrinterIcon />}
            isLoading={isPrinting}
          >
            {t('button.print')}
          </LoadingButton>
        </ReportSelector>
        {OpenButton}
      </Grid>
    </AppBarButtonsPortal>
  );
};

export const AppBarButtons = React.memo(AppBarButtonsComponent);
