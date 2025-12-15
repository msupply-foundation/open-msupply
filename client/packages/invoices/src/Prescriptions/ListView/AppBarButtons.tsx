import React from 'react';
import {
  PlusCircleIcon,
  AppBarButtonsPortal,
  ButtonWithIcon,
  Grid,
  useTranslation,
  ToggleState,
} from '@openmsupply-client/common';
import { ListParams, usePrescriptionList } from '../api';
import { prescriptionToCsv } from '../../utils';
import { NewPrescriptionModal } from './NewPrescriptionModal';
import { ExportSelector } from '@openmsupply-client/system';

interface AppBarButtonsComponentProps {
  modalController: ToggleState;
  listParams: ListParams;
}

export const AppBarButtonsComponent = ({
  modalController,
  listParams,
}: AppBarButtonsComponentProps) => {
  const t = useTranslation();

  const {
    query: { data, isLoading },
  } = usePrescriptionList(listParams);
  const getCsvData = () =>
    data?.nodes?.length ? prescriptionToCsv(data.nodes, t) : null;

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
