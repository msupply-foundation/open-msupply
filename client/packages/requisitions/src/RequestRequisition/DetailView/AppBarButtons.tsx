import React, { FC } from 'react';
import {
  AppBarButtonsPortal,
  ButtonWithIcon,
  PlusCircleIcon,
  Grid,
  useDetailPanel,
  useTranslation,
  useToggle,
} from '@openmsupply-client/common';
import { MasterListSearchModal } from '@openmsupply-client/system';
import { useAddFromMasterList } from '../api';
interface AppBarButtonProps {
  isDisabled: boolean;
  onAddItem: (newState: boolean) => void;
}

export const AppBarButtonsComponent: FC<AppBarButtonProps> = ({
  isDisabled,
  onAddItem,
}) => {
  const { addFromMasterList } = useAddFromMasterList();
  const { OpenButton } = useDetailPanel();
  const t = useTranslation('distribution');
  const modalController = useToggle();

  return (
    <AppBarButtonsPortal>
      <Grid container gap={1}>
        <ButtonWithIcon
          Icon={<PlusCircleIcon />}
          label={t('button.add-from-master-list')}
          onClick={modalController.toggleOn}
        />
        <MasterListSearchModal
          open={modalController.isOn}
          onClose={modalController.toggleOff}
          onChange={masterList => {
            modalController.toggleOff();
            addFromMasterList(masterList);
          }}
        />
        <ButtonWithIcon
          disabled={isDisabled}
          label={t('button.add-item')}
          Icon={<PlusCircleIcon />}
          onClick={() => onAddItem(true)}
        />
        {OpenButton}
      </Grid>
    </AppBarButtonsPortal>
  );
};

export const AppBarButtons = React.memo(AppBarButtonsComponent);
