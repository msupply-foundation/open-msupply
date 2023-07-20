import React, { FC } from 'react';
import {
  DownloadIcon,
  PlusCircleIcon,
  useNotification,
  AppBarButtonsPortal,
  ButtonWithIcon,
  Grid,
  useTranslation,
  FnUtils,
  FileUtils,
  LoadingButton,
  ToggleState,
  EnvUtils,
  Platform,
} from '@openmsupply-client/common';
import { PatientSearchModal } from '@openmsupply-client/system';
import { usePrescription } from '../api';
import { prescriptionToCsv } from '../../utils';

export const AppBarButtonsComponent: FC<{
  modalController: ToggleState;
}> = ({ modalController }) => {
  const { success, error } = useNotification();
  const { mutate: onCreate } = usePrescription.document.insert();
  const t = useTranslation(['distribution', 'common']);
  const { data, isLoading } = usePrescription.document.list();

  const csvExport = async () => {
    if (!data || !data?.nodes.length) {
      error(t('error.no-data'))();
      return;
    }

    const csv = prescriptionToCsv(data.nodes, t);
    FileUtils.exportCSV(csv, t('filename.prescriptions'));
    success(t('success'))();
  };

  return (
    <AppBarButtonsPortal>
      <Grid container gap={1}>
        <ButtonWithIcon
          Icon={<PlusCircleIcon />}
          label={t('button.new-prescription')}
          onClick={modalController.toggleOn}
        />
        <PatientSearchModal
          open={modalController.isOn}
          onClose={modalController.toggleOff}
          onChange={async name => {
            modalController.toggleOff();
            try {
              onCreate({
                id: FnUtils.generateUUID(),
                patientId: name?.id,
              });
            } catch (e) {
              const errorSnack = error(
                'Failed to create prescription! ' + (e as Error).message
              );
              errorSnack();
            }
          }}
        />
        <LoadingButton
          startIcon={<DownloadIcon />}
          isLoading={isLoading}
          variant="outlined"
          onClick={csvExport}
          disabled={EnvUtils.platform === Platform.Android}
        >
          {t('button.export')}
        </LoadingButton>
      </Grid>
    </AppBarButtonsPortal>
  );
};

export const AppBarButtons = React.memo(AppBarButtonsComponent);
