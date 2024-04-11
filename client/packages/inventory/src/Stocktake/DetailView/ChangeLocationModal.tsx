import React, { useState } from 'react';
import {
  Grid,
  useTranslation,
  BasicModal,
  DialogButton,
  Typography,
  InfoIcon,
  InputWithLabelRow,
} from '@openmsupply-client/common';
import {
  LocationRowFragment,
  LocationSearchInput,
} from '@openmsupply-client/system';
import { useStocktake } from '../api';

interface ChangeLocationConfirmationModalProps {
  isOpen: boolean;
  onCancel: () => void;
}

export const ChangeLocationConfirmationModal = ({
  isOpen,
  onCancel,
}: ChangeLocationConfirmationModalProps) => {
  const t = useTranslation('inventory');

  const [location, setLocation] = useState<LocationRowFragment | null>(null);

  const onChangeLocation = useStocktake.line.changeLocation();

  return (
    <BasicModal width={400} height={200} open={isOpen}>
      <Grid container gap={1} flex={1} padding={4} flexDirection="column">
        <Grid container gap={1} flexDirection="row">
          <Grid item>
            <InfoIcon color="secondary" />
          </Grid>
          <Grid item>
            <Typography variant="h6">{t('heading.are-you-sure')}</Typography>
          </Grid>
        </Grid>
        <Grid item>
          <Typography style={{ whiteSpace: 'pre-line' }}>
            {t('messages.confirm-change-location')}
          </Typography>
        </Grid>
        <Grid item margin={2}>
          <InputWithLabelRow
            label={t('label.location')}
            labelWidth="100px"
            Input={
              <LocationSearchInput
                disabled={false}
                selectedLocation={location}
                onChange={setLocation}
                width={200}
              />
            }
          />
        </Grid>
        <Grid
          container
          gap={1}
          flexDirection="row"
          alignItems="flex-end"
          justifyContent="center"
          flex={1}
          display="flex"
          marginTop={2}
        >
          <Grid item>
            <DialogButton variant="cancel" onClick={onCancel} />
          </Grid>
          <Grid item>
            <DialogButton
              variant="ok"
              onClick={async () => {
                await onChangeLocation(location);
                onCancel();
              }}
            />
          </Grid>
        </Grid>
      </Grid>
    </BasicModal>
  );
};
