import React, { useState } from 'react';
import {
  InputWithLabelRow,
  useTranslation,
  ConfirmationModalLayout,
  Grid,
  DialogButton,
  Alert,
  Box,
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
  const onChangeLocation = useStocktakeOld.line.changeLocation();

  const [location, setLocation] = useState<LocationRowFragment | null>(null);

  // Get all unique, non-empty restricted location type IDs from the selected rows
  const uniqueLocationTypeIds = Array.from(
    new Set(rows.map(row => row.item.restrictedLocationTypeId).filter(Boolean))
  );

  // Only want to display location if all restricted location types match
  const hasMultipleLocationTypes = uniqueLocationTypeIds.length > 1;
  const restrictedToLocationTypeId = hasMultipleLocationTypes
    ? undefined
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
      <Box gap={1} display="flex" flexDirection="column">
        <Alert severity="warning">
          {hasMultipleLocationTypes
            ? t('messages.cannot-change-location-multiple-types')
            : t('messages.locations-restricted')}
        </Alert>
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
              enableAPI={!hasMultipleLocationTypes}
            />
          }
        />
      </Box>
    </ConfirmationModalLayout>
  );
};
