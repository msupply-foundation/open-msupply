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
} from '@openmsupply-client/common';
import { SupplierSearchModal } from '@openmsupply-client/system';
import { useReturns } from '../api';
import { outboundReturnsToCsv } from '../../utils';

export const AppBarButtonsComponent: FC<{
  modalController: ToggleState;
}> = ({ modalController }) => {
  const t = useTranslation('replenishment');
  const { success, error } = useNotification();
  // const { mutate: onCreate } = useReturns.document.insertOutbound();
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

  return (
    <AppBarButtonsPortal>
      <SupplierSearchModal
        open={modalController.isOn}
        onClose={modalController.toggleOff}
        onChange={async name => {
          modalController.toggleOff();
          console.log('Selected supplier:', name);
          // try {
          //   await onCreate({
          //     id: FnUtils.generateUUID(),
          //     otherPartyId: name?.id,
          //   });
          // } catch (e) {
          //   const errorSnack = error(
          //     'Failed to create return! ' + (e as Error).message
          //   );
          //   errorSnack();
          // }
        }}
      />
      <Grid container gap={1}>
        <ButtonWithIcon
          Icon={<PlusCircleIcon />}
          label={t('button.new-return')}
          onClick={modalController.toggleOn}
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
