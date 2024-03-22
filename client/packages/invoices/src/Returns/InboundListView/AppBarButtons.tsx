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
  useAuthContext,
  UserPermission,
} from '@openmsupply-client/common';
import { CustomerSearchModal } from '@openmsupply-client/system';
import { useReturns } from '../api';
import { inboundReturnsToCsv } from '../../utils';

export const AppBarButtonsComponent: FC<{
  modalController: ToggleState;
}> = ({ modalController }) => {
  const t = useTranslation('distribution');
  const { success, error } = useNotification();
  const { userHasPermission } = useAuthContext();

  const { mutateAsync: onCreate } = useReturns.document.insertInboundReturn();
  const { fetchAsync, isLoading } = useReturns.document.listAllInbound({
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
    const csv = inboundReturnsToCsv(data.nodes, t);
    FileUtils.exportCSV(csv, t('filename.inbound-returns'));
    success(t('success'))();
  };

  return (
    <AppBarButtonsPortal>
      <CustomerSearchModal
        open={modalController.isOn}
        onClose={modalController.toggleOff}
        onChange={async name => {
          modalController.toggleOff();
          try {
            await onCreate({
              id: FnUtils.generateUUID(),
              customerId: name?.id,
              inboundReturnLines: [],
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
          onClick={modalController.toggleOn}
          disabled={!userHasPermission(UserPermission.InboundReturnMutate)}
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
