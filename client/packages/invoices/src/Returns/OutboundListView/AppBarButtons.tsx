import React, { FC } from 'react';
import {
  DownloadIcon,
  PlusCircleIcon,
  AppBarButtonsPortal,
  ButtonWithIcon,
  Grid,
  useTranslation,
  LoadingButton,
  ToggleState,
  EnvUtils,
  Platform,
  useNotification,
  FileUtils,
  FnUtils,
  UserPermission,
  useAuthContext,
  useDisabledNotificationToast,
} from '@openmsupply-client/common';
import { SupplierSearchModal } from '@openmsupply-client/system';
import { useReturns } from '../api';
import { outboundReturnsToCsv } from '../../utils';

export const AppBarButtonsComponent: FC<{
  modalController: ToggleState;
}> = ({ modalController }) => {
  const t = useTranslation('replenishment');
  const { success, error } = useNotification();
  const { userHasPermission } = useAuthContext();
  const showPermissionDenied = useDisabledNotificationToast();

  const { mutateAsync: onCreate } = useReturns.document.insertOutboundReturn();
  const { fetchAsync, isLoading } = useReturns.document.listAllOutbound({
    key: 'createdDateTime',
    direction: 'desc',
    isDesc: true,
  });

  const csvExport = async () => {
    const data = await fetchAsync();
    if (!data || !data?.nodes.length) {
      error(t('error.no-data'))();
      return;
    }
    const csv = outboundReturnsToCsv(data.nodes, t);
    FileUtils.exportCSV(csv, t('filename.outbound-returns'));
    success(t('success'))();
  };

  const openModal = () => {
    if (!userHasPermission(UserPermission.OutboundReturnMutate)) {
      showPermissionDenied();
      return;
    }
    modalController.toggleOn();
  };

  return (
    <AppBarButtonsPortal>
      <SupplierSearchModal
        open={modalController.isOn}
        onClose={modalController.toggleOff}
        onChange={async name => {
          modalController.toggleOff();
          try {
            await onCreate({
              id: FnUtils.generateUUID(),
              supplierId: name?.id,
              outboundReturnLines: [],
            });
          } catch (e) {
            const errorSnack = error(
              `${t('error.failed-to-create-return')} ${(e as Error).message}`
            );
            errorSnack();
          }
        }}
      />
      <Grid container gap={1}>
        <ButtonWithIcon
          Icon={<PlusCircleIcon />}
          label={t('button.new-return')}
          onClick={openModal}
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
