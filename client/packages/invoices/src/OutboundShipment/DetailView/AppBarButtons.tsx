import React, { FC } from 'react';
import {
  AppBarButtonsPortal,
  BookIcon,
  ButtonWithIcon,
  PlusCircleIcon,
  Grid,
  useDetailPanel,
  useTranslation,
} from '@openmsupply-client/common';
import { ExternalURL } from '@openmsupply-client/config';

interface AppBarButtonProps {
  isDisabled: boolean;
  onAddItem: (newState: boolean) => void;
}

export const AppBarButtonsComponent: FC<AppBarButtonProps> = ({
  isDisabled,
  onAddItem,
}) => {
  const { OpenButton } = useDetailPanel();
  const t = useTranslation('common');

  return (
    <AppBarButtonsPortal>
      <Grid container gap={1}>
        <ButtonWithIcon
          disabled={isDisabled}
          label={t('button.add-item')}
          Icon={<PlusCircleIcon />}
          onClick={() => onAddItem(true)}
        />
        <ButtonWithIcon
          Icon={<BookIcon />}
          label={t('button.docs')}
          onClick={() => (location.href = ExternalURL.PublicDocs)}
        />
        {OpenButton}
      </Grid>
    </AppBarButtonsPortal>
  );
};

export const AppBarButtons = React.memo(AppBarButtonsComponent);
