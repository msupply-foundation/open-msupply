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
  useCallbackWithPermission,
} from '@openmsupply-client/common';
import { CustomerSearchModal } from '@openmsupply-client/system';
import { useReturns } from '../api';
import { customerReturnsToCsv } from '../../utils';

export const AppBarButtonsComponent: FC<{
  modalController: ToggleState;
}> = ({ modalController }) => {
  const t = useTranslation('distribution');
  const { success, error } = useNotification();

  const { mutateAsync: onCreate } = useReturns.document.insertCustomerReturn();
  const { fetchAsync, isLoading } = useReturns.document.listAllCustomer({
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
    const csv = customerReturnsToCsv(data.nodes, t);
    FileUtils.exportCSV(csv, t('filename.customer-returns'));
    success(t('success'))();
  };
  const openModal = useCallbackWithPermission(
    UserPermission.CustomerReturnMutate,
    modalController.toggleOn
  );

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
              customerReturnLines: [],
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
