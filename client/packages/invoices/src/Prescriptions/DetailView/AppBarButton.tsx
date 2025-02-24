import React, { FC } from 'react';
import {
  AppBarButtonsPortal,
  ButtonWithIcon,
  PlusCircleIcon,
  Grid,
  useDetailPanel,
  useTranslation,
  InfoOutlineIcon,
  LoadingButton,
  PrinterIcon,
} from '@openmsupply-client/common';
import { usePrescription } from '../api';
import { Draft } from '../..';

interface AppBarButtonProps {
  onAddItem: (draft?: Draft) => void;
  onViewHistory: (draft?: Draft) => void;
}

export const AppBarButtonsComponent: FC<AppBarButtonProps> = ({
  onAddItem,
  onViewHistory,
}) => {
  const { isDisabled } = usePrescription();
  const { OpenButton } = useDetailPanel();
  const t = useTranslation();
  return (
    <AppBarButtonsPortal>
      <Grid container gap={1}>
        <LoadingButton
          variant="outlined"
          startIcon={<PrinterIcon />}
          isLoading={false}
          label={t('button.print-prescription-label')}
        />
        <ButtonWithIcon
          label={t('button.history')}
          Icon={<InfoOutlineIcon />}
          onClick={() => onViewHistory()}
        />
        <ButtonWithIcon
          disabled={isDisabled}
          label={t('button.add-item')}
          Icon={<PlusCircleIcon />}
          onClick={() => onAddItem()}
        />
        {OpenButton}
      </Grid>
    </AppBarButtonsPortal>
  );
};

export const AppBarButtons = React.memo(AppBarButtonsComponent);
