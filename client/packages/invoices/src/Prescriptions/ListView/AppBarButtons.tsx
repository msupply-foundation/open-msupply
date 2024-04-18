import React, { FC } from 'react';
import { AppRoute } from '@openmsupply-client/config';
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
  useNavigate,
  RouteBuilder,
} from '@openmsupply-client/common';
import { PatientSearchModal } from '@openmsupply-client/system';
import { usePrescription } from '../api';
import { prescriptionToCsv } from '../../utils';

export const AppBarButtonsComponent: FC<{
  modalController: ToggleState;
}> = ({ modalController }) => {
  const t = useTranslation('dispensary');
  const navigate = useNavigate();
  const { success, error } = useNotification();
  const { mutateAsync: onCreate } = usePrescription.document.insert();
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
              }).then(invoiceNumber => {
                navigate(
                  RouteBuilder.create(AppRoute.Dispensary)
                    .addPart(AppRoute.Prescription)
                    .addPart(String(invoiceNumber))
                    .build(),
                  { replace: true }
                );
              });
            } catch (e) {
              const errorSnack = error(
                t('error.failed-to-create-prescription') + (e as Error).message
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
