import React, { ReactElement, useEffect, useState } from 'react';
import {
  Alert,
  BaseButton,
  Box,
  InputWithLabelRow,
  ReadOnlyInput,
  Typography,
  useTranslation,
} from '@openmsupply-client/common';
import { formatCoordinate } from './utils';

export const DisplayCoordinates = (): ReactElement => {
  const t = useTranslation();
  const [latitude, setLatitude] = useState<string>();
  const [longitude, setLongitude] = useState<string>();
  const [formattedLatitude, setFormattedLatitude] = useState<string>();
  const [formattedLongitude, setFormattedLongitude] = useState<string>();
  const [errorMessage, setErrorMessage] = useState<string>();

  const getWebCoordinates = (position: GeolocationPosition) => {
    const coords: GeolocationCoordinates = position.coords;
    const lat = coords.latitude;
    const lon = coords.longitude;

    setLatitude(lat.toString());
    setLongitude(lon.toString());
    setFormattedLatitude(formatCoordinate(lat, true));
    setFormattedLongitude(formatCoordinate(lon, false));
  };

  const handleGeolocationWebError = (error: GeolocationPositionError) => {
    switch (error.code) {
      case error.PERMISSION_DENIED:
        setErrorMessage(t('error.permission-denied'));
        break;
      case error.POSITION_UNAVAILABLE:
        setErrorMessage(t('error.position-unavailable'));
        break;
      case error.TIMEOUT:
        setErrorMessage(t('error.timeout'));
        break;
      default:
        setErrorMessage(t('error.unknown-geolocation-error'));
        break;
    }
  };

  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position: GeolocationPosition) => getWebCoordinates(position),
        (error: GeolocationPositionError) => handleGeolocationWebError(error)
      );
    } else {
      setErrorMessage(t('error.geolocation-not-supported'));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Box pt={4}>
      <Typography variant="h5" pb={2}>
        {t('heading.gps-coordinates')}
      </Typography>
      {errorMessage ? (
        <Box sx={{ pt: 4, display: 'flex', justifyContent: 'center' }}>
          <Alert severity="error">{errorMessage}</Alert>
        </Box>
      ) : (
        <>
          <InputWithLabelRow
            label={t('label.latitude')}
            Input={
              <ReadOnlyInput value={`${latitude} / ${formattedLatitude}`} />
            }
            sx={{ pb: 2 }}
          />
          <InputWithLabelRow
            label={t('label.longitude')}
            Input={
              <ReadOnlyInput value={`${longitude} / ${formattedLongitude}`} />
            }
            sx={{ pb: 2 }}
          />
        </>
      )}
      <Box display="flex" justifyContent={'flex-end'}>
        <BaseButton onClick={() => {}} size={'small'}>
          {t('label.capture-location')}
        </BaseButton>
      </Box>
    </Box>
  );
};
