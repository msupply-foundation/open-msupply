import React from 'react';
import {
  DownloadIcon,
  PlusCircleIcon,
  useNotification,
  AppBarButtonsPortal,
  ButtonWithIcon,
  Grid,
  useTranslation,
  LoadingButton,
  ToggleState,
  useExportCSV,
} from '@openmsupply-client/common';
import { ListParams, usePrescriptionList } from '../api';
import { prescriptionToCsv } from '../../utils';
import { NewPrescriptionModal } from './NewPrescriptionModal';

interface AppBarButtonsComponentProps {
  modalController: ToggleState;
  listParams: ListParams;
}

export const AppBarButtonsComponent = ({
  modalController,
  listParams,
}: AppBarButtonsComponentProps) => {
  const t = useTranslation();
  const { error } = useNotification();
  const exportCSV = useExportCSV();

  const {
    query: { data, isLoading },
  } = usePrescriptionList(listParams);

  const csvExport = async () => {
    if (!data || !data?.nodes.length) {
      error(t('error.no-data'))();
      return;
    }

    const csv = prescriptionToCsv(data.nodes, t);
    exportCSV(csv, t('filename.prescriptions'));
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
        <LoadingButton
          startIcon={<DownloadIcon />}
          isLoading={isLoading}
          variant="outlined"
          onClick={csvExport}
          label={t('button.export')}
        />
      </Grid>
    </AppBarButtonsPortal>
  );
};

export const AppBarButtons = React.memo(AppBarButtonsComponent);
