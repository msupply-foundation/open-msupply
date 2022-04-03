import React, { FC } from 'react';
import {
  FnUtils,
  DownloadIcon,
  PlusCircleIcon,
  useNotification,
  AppBarButtonsPortal,
  ButtonWithIcon,
  Grid,
  useTranslation,
  useToggle,
} from '@openmsupply-client/common';
import { SupplierSearchModal } from '@openmsupply-client/system';
import { useInsertInbound } from '../api';

export const AppBarButtons: FC = () => {
  const modalController = useToggle();
  const { mutate: onCreate } = useInsertInbound();
  const { success } = useNotification();
  const t = useTranslation('replenishment');

  return (
    <AppBarButtonsPortal>
      <Grid container gap={1}>
        <ButtonWithIcon
          Icon={<PlusCircleIcon />}
          label={t('button.new-shipment')}
          onClick={modalController.toggleOn}
        />
        <ButtonWithIcon
          Icon={<DownloadIcon />}
          label={t('button.export', { ns: 'common' })}
          onClick={success('Downloaded successfully')}
        />
      </Grid>
      <SupplierSearchModal
        open={modalController.isOn}
        onClose={modalController.toggleOff}
        onChange={async name => {
          modalController.toggleOff();
          onCreate({ id: FnUtils.generateUUID(), otherPartyId: name?.id });
        }}
      />
    </AppBarButtonsPortal>
  );
};
