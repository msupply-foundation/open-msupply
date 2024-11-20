import React, { FC } from 'react';
import { AppRoute } from '@openmsupply-client/config';
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
  RouteBuilder,
  useNavigate,
} from '@openmsupply-client/common';
import { SupplierSearchModal } from '@openmsupply-client/system';
import { useReturns } from '../api';
import { supplierReturnsToCsv } from '../../utils';

export const AppBarButtonsComponent: FC<{
  modalController: ToggleState;
}> = ({ modalController }) => {
  const t = useTranslation();
  const { success, error } = useNotification();
  const navigate = useNavigate();
  const { mutateAsync: onCreate } = useReturns.document.insertSupplierReturn();
  const { fetchAsync, isLoading } = useReturns.document.listAllSupplier({
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
    const csv = supplierReturnsToCsv(data.nodes, t);
    FileUtils.exportCSV(csv, t('filename.supplier-returns'));
    success(t('success'))();
  };

  const openModal = useCallbackWithPermission(
    UserPermission.SupplierReturnMutate,
    modalController.toggleOn
  );

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
              supplierReturnLines: [],
            }).then(invoiceNumber => {
              navigate(
                RouteBuilder.create(AppRoute.Replenishment)
                  .addPart(AppRoute.SupplierReturn)
                  .addPart(String(invoiceNumber))
                  .build()
              );
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
