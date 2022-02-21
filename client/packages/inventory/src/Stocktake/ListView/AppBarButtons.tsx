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
} from '@openmsupply-client/common';

export const AppBarButtons: FC = () => {
  const { info, success } = useNotification();
  const t = useTranslation(['distribution', 'common']);

  return (
    <AppBarButtonsPortal>
      <Grid container gap={1}>
        <ButtonWithIcon
          Icon={<PlusCircleIcon />}
          label={t('label.new-stocktake')}
          onClick={() => {}}
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
