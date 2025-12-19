import React from 'react';
import {
  PlusCircleIcon,
  AppBarButtonsPortal,
  ButtonWithIcon,
  Grid,
  useTranslation,
  ToggleState,
  FilterBy,
} from '@openmsupply-client/common';
import { useExportPrescriptionList } from '../api';
import { prescriptionToCsv } from '../../utils';
import { NewPrescriptionModal } from './NewPrescriptionModal';
import { ExportSelector } from '@openmsupply-client/system';

interface AppBarButtonsComponentProps {
  modalController: ToggleState;
  filterBy: FilterBy | null;
}

export const AppBarButtonsComponent = ({
  modalController,
  filterBy,
}: AppBarButtonsComponentProps) => {
  const t = useTranslation();

  const { fetchPrescription, isLoading } = useExportPrescriptionList(filterBy);
  const getCsvData = async () => {
    const { data } = await fetchPrescription();
    return data?.nodes?.length ? prescriptionToCsv(data.nodes, t) : null;
  };

  return (
    <AppBarButtonsPortal>
      <Grid container gap={1}>
        <ButtonWithIcon
          Icon={<PlusCircleIcon />}
          label={t('button.new-prescription')}
          onClick={modalController.toggleOn}
        />
        <NewPrescriptionModal
          open={modalController.isOn}
          onClose={modalController.toggleOff}
        />
        <ExportSelector
          getCsvData={getCsvData}
          filename={t('filename.prescriptions')}
          isLoading={isLoading}
        />
      </Grid>
    </AppBarButtonsPortal>
  );
};

export const AppBarButtons = React.memo(AppBarButtonsComponent);
