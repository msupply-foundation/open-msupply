import React, { useState } from 'react';
import {
  InputWithLabelRow,
  useTranslation,
  ConfirmationModalLayout,
  Grid,
  DialogButton,
  Alert,
} from '@openmsupply-client/common';
import {
  LocationRowFragment,
  LocationSearchInput,
} from '@openmsupply-client/system';
import { StocktakeLineFragment, useStocktakeOld } from '../api';

interface ChangeLocationConfirmationModalProps {
  isOpen: boolean;
  onCancel: () => void;
  clearSelected: () => void;
  rows: StocktakeLineFragment[];
}

export const ChangeLocationConfirmationModal = ({
  isOpen,
  onCancel,
  clearSelected,
  rows,
}: ChangeLocationConfirmationModalProps) => {
  const t = useTranslation();

  const [location, setLocation] = useState<LocationRowFragment | null>(null);

  const onChangeLocation = useStocktakeOld.line.changeLocation();

  // Get all unique, non-empty restricted location type IDs from the selected rows
  const uniqueLocationTypeIds = Array.from(
    new Set(rows.map(row => row.item.restrictedLocationTypeId).filter(Boolean))
  );

  const restrictedToLocationTypeId =
    // Location filter will return none if multiple location type ids present
    uniqueLocationTypeIds.length > 1
      ? 'multiple location type ids'
      : uniqueLocationTypeIds[0];

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
      {uniqueLocationTypeIds.length > 0 && (
        <Alert severity="warning">{t('messages.locations-restricted')}</Alert>
      )}
      <InputWithLabelRow
        label={t('label.location')}
        labelWidth="100px"
        Input={
          <LocationSearchInput
            disabled={false}
            selectedLocation={location}
            onChange={setLocation}
            width={200}
            restrictedToLocationTypeId={restrictedToLocationTypeId}
          />
        }
      />
    </ConfirmationModalLayout>
  );
};
