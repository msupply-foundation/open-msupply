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

  // Find all unique location type restrictions for the selected rows
  const restrictedLocationTypeIds = Array.from(
    new Set(rows.map(row => row.item.restrictedLocationTypeId).filter(Boolean))
  );

  // E.g. 'freezer', 'room-temp' <- these conflict, we should disable changing location
  const hasConflictingRestrictedTypes = restrictedLocationTypeIds.length > 1;

  const volumeRequired = rows.reduce((totalVolume, row) => {
    const numPacks = row.countedNumberOfPacks ?? row.snapshotNumberOfPacks;
    return totalVolume + numPacks * row.volumePerPack;
  }, 0);

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
        {restrictedLocationTypeIds.length > 0 && (
          <Alert severity="warning" sx={{ width: 320 }}>
            {
              hasConflictingRestrictedTypes
                ? t('messages.cannot-change-location-multiple-types')
                : t('messages.locations-restricted') // some lines `null`, some lines `freezer`, so we only show freezer locations - warn user
            }
          </Alert>
        )}
        <InputWithLabelRow
          label={t('label.location')}
          labelWidth="100px"
          Input={
            <LocationSearchInput
              disabled={false}
              selectedLocation={location}
              onChange={setLocation}
              width={210}
              restrictedToLocationTypeId={restrictedLocationTypeIds[0]} // if there is only one type, restrict to that type (more than one type disables the input)
              volumeRequired={volumeRequired}
              enableAPI={!hasConflictingRestrictedTypes}
            />
          }
        />
      </Box>
    </ConfirmationModalLayout>
  );
};
