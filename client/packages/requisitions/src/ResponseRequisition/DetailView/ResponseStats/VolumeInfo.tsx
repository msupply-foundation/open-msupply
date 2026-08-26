import React from 'react';
import {
  useTranslation,
  Box,
  Typography,
  NumUtils,
} from '@openmsupply-client/common';
import { AvailableVolumeAtLocationTypeFragment } from '../../api';

interface VolumeInformationProps {
  availableVolumeAtLocationType: AvailableVolumeAtLocationTypeFragment;
  itemVolume: number;
}

export const VolumeInformation = ({
  availableVolumeAtLocationType,
  itemVolume,
}: VolumeInformationProps) => {
  const t = useTranslation();
  const { availableVolume, locationType } = availableVolumeAtLocationType;
  const availableVolumeDisplay = availableVolume - itemVolume;

  return (
    <Box marginTop={2}>
      <Box>
        <Typography variant="h6" style={{ textAlign: 'start' }}>
          {t('label.volume')}
        </Typography>
      </Box>
      <Typography variant="body1">
        {t('label.volume-for-item', {
          itemVolume: NumUtils.round(itemVolume, 5),
        })}
      </Typography>
      {availableVolumeDisplay <= 0 ? (
        <Typography variant="body2" fontWeight={700} color="error.main">
          {t('label.location-type-full', {
            locationType: locationType.name,
          })}
        </Typography>
      ) : (
        <Typography variant="body1">
          {t('label.available-volume-for-location-type', {
            locationType: locationType.name,
            availableVolume: NumUtils.round(availableVolumeDisplay, 5),
          })}
        </Typography>
      )}
      <Typography variant="body2" fontWeight={700}></Typography>
    </Box>
  );
};
