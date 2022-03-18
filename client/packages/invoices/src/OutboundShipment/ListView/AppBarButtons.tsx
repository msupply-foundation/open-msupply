import React, { FC } from 'react';
import {
  DownloadIcon,
  PlusCircleIcon,
  PrinterIcon,
  useNotification,
  AppBarButtonsPortal,
  ButtonWithIcon,
  Grid,
  useTranslation,
  useToggle,
  FnUtils,
} from '@openmsupply-client/common';
import { CustomerSearchModal } from '@openmsupply-client/system';
import { useOutbound } from '../api';

export const AppBarButtonsComponent: FC = () => {
  const { info, success, error } = useNotification();
  const { mutate: onCreate } = useOutbound.document.insert();
  const t = useTranslation(['distribution', 'common']);
  const modalController = useToggle();

  return (
    <AppBarButtonsPortal>
      <Grid container gap={1}>
        <ButtonWithIcon
          Icon={<PlusCircleIcon />}
          label={t('button.new-shipment')}
          onClick={modalController.toggleOn}
        />
        <CustomerSearchModal
          open={modalController.isOn}
          onClose={modalController.toggleOff}
          onChange={async name => {
            modalController.toggleOff();
            try {
              await onCreate({
                id: FnUtils.generateUUID(),
                otherPartyId: name?.id,
              });
            } catch (e) {
              const errorSnack = error(
                'Failed to create invoice! ' + (e as Error).message
              );
              errorSnack();
            }
          }}
        />
        <ButtonWithIcon
          Icon={<DownloadIcon />}
          label={t('button.export')}
          onClick={success('Downloaded successfully')}
        />
        <ButtonWithIcon
          Icon={<PrinterIcon />}
          label={t('button.print')}
          onClick={info('No printer detected')}
        />
      </Grid>
    </AppBarButtonsPortal>
  );
};

export const AppBarButtons = React.memo(AppBarButtonsComponent);
