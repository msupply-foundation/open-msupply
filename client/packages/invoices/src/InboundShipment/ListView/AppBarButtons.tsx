import React, { FC } from 'react';
import {
  generateUUID,
  DownloadIcon,
  PlusCircleIcon,
  PrinterIcon,
  useNotification,
  AppBarButtonsPortal,
  ButtonWithIcon,
  Grid,
  useTranslation,
  useToggle,
} from '@openmsupply-client/common';
import { NameSearchModal } from '@openmsupply-client/system';
import { useInsertInbound } from '../api';

export const AppBarButtons: FC = () => {
  const modalController = useToggle();
  const { mutate: onCreate } = useInsertInbound();
  const { info, success } = useNotification();
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
        <ButtonWithIcon
          Icon={<PrinterIcon />}
          label={t('button.print', { ns: 'common' })}
          onClick={info('No printer detected')}
        />
      </Grid>
      <NameSearchModal
        type="supplier"
        open={modalController.isOn}
        onClose={modalController.toggleOff}
        onChange={async name => {
          modalController.toggleOff();
          onCreate({
            id: generateUUID(),
            otherPartyId: name?.id,
          });
        }}
      />
    </AppBarButtonsPortal>
  );
};
