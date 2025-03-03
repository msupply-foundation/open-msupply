import React, { useState } from 'react';
import {
  InputWithLabelRow,
  useTranslation,
  ConfirmationModalLayout,
  Grid,
  DialogButton,
} from '@openmsupply-client/common';
import {
  LocationRowFragment,
  LocationSearchInput,
} from '@openmsupply-client/system';
import { useStocktake } from '../api';

interface ChangeLocationConfirmationModalProps {
  isOpen: boolean;
  onCancel: () => void;
  clearSelected: () => void;
}

export const ChangeLocationConfirmationModal = ({
  isOpen,
  onCancel,
  clearSelected,
}: ChangeLocationConfirmationModalProps) => {
  const t = useTranslation();

  const [location, setLocation] = useState<LocationRowFragment | null>(null);

  const onChangeLocation = useStocktake.line.changeLocation();

  return (
    <ConfirmationModalLayout
      isOpen={isOpen}
      title={t('heading.are-you-sure')}
      message={t('messages.confirm-change-location')}
      buttons={
        <>
          <Grid>
            <DialogButton variant="cancel" onClick={onCancel} />
          </Grid>
          <Grid>
            <DialogButton
              variant="ok"
              onClick={async () => {
                await onChangeLocation(location);
                clearSelected();
                onCancel();
              }}
            />
          </Grid>
        </>
      }
    >
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
    </ConfirmationModalLayout>
  );
};
