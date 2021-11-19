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
  const t = useTranslation(['outbound-shipment', 'common']);

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
          label={t('button.export')}
          onClick={success('Downloaded successfully')}
        />
        <ButtonWithIcon
          Icon={<PrinterIcon />}
          label={t('button.print')}
          onClick={info('No printer detected')}
        />
        <ButtonWithIcon
          Icon={<BookIcon />}
          label={t('button.docs')}
          onClick={() => (location.href = ExternalURL.PublicDocs)}
        />
      </Grid>
    </AppBarButtonsPortal>
  );
};
