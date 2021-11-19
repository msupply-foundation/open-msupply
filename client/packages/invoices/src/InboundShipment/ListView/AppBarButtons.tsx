import React, { FC } from 'react';
import {
  DownloadIcon,
  PlusCircleIcon,
  PrinterIcon,
  useNotification,
  AppBarButtonsPortal,
  BookIcon,
  ButtonWithIcon,
  Grid,
  useTranslation,
} from '@openmsupply-client/common';
import { ExternalURL } from '@openmsupply-client/config';

interface AppBarButtonsProps {
  onCreate: (toggle: boolean) => void;
}

export const AppBarButtons: FC<AppBarButtonsProps> = ({ onCreate }) => {
  const { info, success } = useNotification();
  const t = useTranslation(['outboundShipment', 'common']);

  return (
    <AppBarButtonsPortal>
      <Grid container gap={1}>
        <ButtonWithIcon
          Icon={<PlusCircleIcon />}
          label={t('button.new-shipment')}
          onClick={() => onCreate(true)}
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
        <ButtonWithIcon
          Icon={<BookIcon />}
          label={t('button.docs', { ns: 'common' })}
          onClick={() => (location.href = ExternalURL.PublicDocs)}
        />
      </Grid>
    </AppBarButtonsPortal>
  );
};
