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
  useNotification,
  FnUtils,
  UserPermission,
  useCallbackWithPermission,
  useNavigate,
  RouteBuilder,
  useExportCSV,
  usePreferences,
} from '@openmsupply-client/common';
import { CustomerSearchModal } from '@openmsupply-client/system';
import { useReturns } from '../api';
import { customerReturnsToCsv } from '../../utils';
import { AppRoute } from '@openmsupply-client/config';

export const AppBarButtonsComponent: FC<{
  modalController: ToggleState;
}> = ({ modalController }) => {
  const t = useTranslation();
  const navigate = useNavigate();
  const { error, info } = useNotification();
  const exportCSV = useExportCSV();
  const { disableManualReturns } = usePreferences();

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
    exportCSV(csv, t('filename.customer-returns'));
  };

  const openModal = useCallbackWithPermission(
    UserPermission.CustomerReturnMutate,
    modalController.toggleOn
  );

  const handleClick = (): void => {
    if (disableManualReturns) {
      info(t('messages.manual-returns-preferences-disabled'))();
      return;
    }
    openModal();
  };

  return (
    <AppBarButtonsPortal>
      <Grid container gap={1}>
        <ButtonWithIcon
          Icon={<PlusCircleIcon />}
          label={t('button.new-return')}
          onClick={handleClick}
        />
        <LoadingButton
          startIcon={<DownloadIcon />}
          isLoading={isLoading}
          variant="outlined"
          onClick={csvExport}
          label={t('button.export')}
        />
      </Grid>
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
            }).then(customerReturn => {
              navigate(
                RouteBuilder.create(AppRoute.Distribution)
                  .addPart(AppRoute.CustomerReturn)
                  .addPart(String(customerReturn?.id))
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
    </AppBarButtonsPortal>
  );
};

export const AppBarButtons = React.memo(AppBarButtonsComponent);
