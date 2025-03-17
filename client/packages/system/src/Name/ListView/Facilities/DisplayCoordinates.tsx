import React, { ReactElement, useEffect, useState } from 'react';
import {
  Alert,
  ButtonWithIcon,
  Box,
  InputWithLabelRow,
  ReadOnlyInput,
  Stack,
  Typography,
  useTranslation,
  LocationIcon,
} from '@openmsupply-client/common';
import { Geolocation } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';

export const DisplayCoordinates = (): ReactElement => {
  const t = useTranslation();

  const [loading, setLoading] = useState(false);
  const [latitude, setLatitude] = useState<number>();
  const [longitude, setLongitude] = useState<number>();
  const [errorMessage, setErrorMessage] = useState<string>();

  const updateCoordinates = (latitude: number, longitude: number): void => {
    setLatitude(parseFloat(latitude.toFixed(6)));
    setLongitude(parseFloat(longitude.toFixed(6)));
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

  const fetchCoordinates = async () => {
    setLoading(true);
    try {
      const isNativePlatform = Capacitor.isNativePlatform();
      const isGeolocationAvailable = Capacitor.isPluginAvailable('Geolocation');

      // Sets coordinates for Android devices
      if (isGeolocationAvailable && isNativePlatform) {
        const geolocationPermission = await Geolocation.checkPermissions();

        if (
          geolocationPermission.location !== 'granted' ||
          geolocationPermission.coarseLocation !== 'granted'
        ) {
          await Geolocation.requestPermissions();
        }

        const position = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
        });
        updateCoordinates(position.coords.latitude, position.coords.longitude);
        return;
      }

      // Sets coordinates for browsers
      if ('geolocation' in navigator && !isNativePlatform) {
        navigator.geolocation.getCurrentPosition(
          (position: GeolocationPosition) =>
            updateCoordinates(
              position.coords.latitude,
              position.coords.longitude
            ),
          (error: GeolocationPositionError) => handleGeolocationWebError(error)
        );
        return;
      }

      setErrorMessage(t('error.geolocation-not-supported'));
      return;
    } catch (error) {
      setErrorMessage(t('error.unknown-geolocation-error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoordinates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formatCoordinate = (
    coordinate?: number,
    isLatitude?: boolean
  ): string => {
    if (!coordinate) return '';

    const direction = isLatitude
      ? coordinate >= 0
        ? 'N'
        : 'S'
      : coordinate >= 0
        ? 'E'
        : 'W';

    const absolute = Math.abs(coordinate);
    const degrees = Math.floor(absolute);
    const minutes = Math.floor((absolute - degrees) * 60);
    const seconds = ((absolute * 3600) % 60).toFixed(3);
    return `${direction} ${degrees}° ${minutes}' ${seconds}"`;
  };

  const isLatitude = true;
  const formattedLatitude = formatCoordinate(latitude, isLatitude);
  const formattedLongitude = formatCoordinate(longitude, !isLatitude);

  return (
    <>
      <Typography fontWeight="bold">{t('label.gps-coordinates')}:</Typography>
      {loading ? (
        <Box sx={{ pb: 2, display: 'flex', justifyContent: 'center' }}>
          <Typography>{t('label.fetching-coordinates')}</Typography>
        </Box>
      ) : errorMessage ? (
        <Box sx={{ pb: 2, display: 'flex', justifyContent: 'center' }}>
          <Alert severity="error">{errorMessage}</Alert>
        </Box>
      ) : (
        <Stack direction="row">
          <Box sx={{ flexGrow: 1 }}>
            <InputWithLabelRow
              label={t('label.latitude')}
              Input={
                <ReadOnlyInput value={`${latitude} / ${formattedLatitude}`} />
              }
            />
            <InputWithLabelRow
              label={t('label.longitude')}
              Input={
                <ReadOnlyInput value={`${longitude} / ${formattedLongitude}`} />
              }
            />
          </Box>
          <ButtonWithIcon
            disabled
            onClick={() => {}}
            Icon={<LocationIcon />}
            label={t('label.update-live-location')}
          />
        </Stack>
      )}
    </>
  );
};
