import React from 'react';
import {
  DownloadIcon,
  useNotification,
  useTranslation,
  AppBarButtonsPortal,
  Grid,
  FileUtils,
  LoadingButton,
  EnvUtils,
  Platform,
  ToggleState,
  FnUtils,
  RouteBuilder,
  ButtonWithIcon,
  PlusCircleIcon,
  useNavigate,
} from '@openmsupply-client/common';
import { useResponse } from '../api';
import { responsesToCsv } from '../../utils';
import { AppRoute } from '@openmsupply-client/config';
import { CustomerSearchModal } from '@openmsupply-client/system';

export const AppBarButtons = ({
  modalController,
}: {
  modalController: ToggleState;
}) => {
  const t = useTranslation();
  const navigate = useNavigate();
  const { success, error } = useNotification();
  const { mutateAsync: onCreate } = useResponse.document.insert();
  const { mutateAsync, isLoading } = useResponse.document.listAll({
    key: 'createdDatetime',
    direction: 'desc',
    isDesc: true,
  });

  const csvExport = async () => {
    const data = await mutateAsync();
    if (!data || !data?.nodes.length) {
      error(t('error.no-data'))();
      return;
    }

    const csv = responsesToCsv(data.nodes, t);
    FileUtils.exportCSV(csv, 'requisitions');
    success(t('success'))();
  };

  return (
    <AppBarButtonsPortal>
      <Grid container gap={1}>
        <ButtonWithIcon
          Icon={<PlusCircleIcon />}
          label={t('button.new-requisition')}
          onClick={modalController.toggleOn}
        />
        <LoadingButton
          startIcon={<DownloadIcon />}
          isLoading={isLoading}
          onClick={csvExport}
          variant="outlined"
          disabled={EnvUtils.platform === Platform.Android}
        >
          {t('button.export')}
        </LoadingButton>
      </Grid>
      <CustomerSearchModal
        open={modalController.isOn}
        onClose={modalController.toggleOff}
        onChange={async name => {
          modalController.toggleOff();
          try {
            await onCreate({
              id: FnUtils.generateUUID(),
              otherPartyId: name.id,
            }).then(({ requisitionNumber }) => {
              navigate(
                RouteBuilder.create(AppRoute.Distribution)
                  .addPart(AppRoute.CustomerRequisition)
                  .addPart(String(requisitionNumber))
                  .build(),
                { replace: true }
              );
            });
          } catch (e) {
            const errorSnack = error(
              `${t('message.failed-to-create-requisition')}: ${(e as Error).message}`
            );
            errorSnack();
          }
        }}
      />
    </AppBarButtonsPortal>
  );
};
