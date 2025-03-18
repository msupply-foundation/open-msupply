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

interface DisplayCoordinatesProps {
  latitude?: number;
  longitude?: number;
  onDraftPropertiesChange: (latitude: number, longitude: number) => void;
}

export const DisplayCoordinates = ({
  latitude,
  longitude,
  onDraftPropertiesChange,
}: DisplayCoordinatesProps): ReactElement => {
  const t = useTranslation();

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>();
  const [distance, setDistance] = useState<number>();

  const calculateDistance = (
    targetLatitude: number,
    targetLongitude: number
  ) => {
    if (!latitude || !longitude) return;
    const toRadians = (degrees: number) => degrees * (Math.PI / 180);

    // Radius of the Earth in kilometers
    const earthRadiusKm = 6371;

    const deltaLatitude = toRadians(
      parseFloat(targetLatitude.toFixed(6)) - latitude
    );
    const deltaLongitude = toRadians(
      parseFloat(targetLongitude.toFixed(6)) - longitude
    );

    // Determines distance between two points in a sphere
    const haversineFormula =
      Math.sin(deltaLatitude / 2) * Math.sin(deltaLatitude / 2) +
      Math.cos(toRadians(latitude)) *
        Math.cos(toRadians(targetLatitude)) *
        Math.sin(deltaLongitude / 2) *
        Math.sin(deltaLongitude / 2);

    const centralAngle =
      2 *
      Math.atan2(Math.sqrt(haversineFormula), Math.sqrt(1 - haversineFormula));

    // Distance in kilometers
    const distanceKm = parseFloat((earthRadiusKm * centralAngle).toFixed(6));
    setDistance(distanceKm);
  };

  const updateCoordinates = (latitude: number, longitude: number): void => {
    const fixedLatitude = parseFloat(latitude.toFixed(6));
    const fixedLongitude = parseFloat(longitude.toFixed(6));
    onDraftPropertiesChange(fixedLatitude, fixedLongitude);
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

  const fetchCoordinates = async (
    onSuccess: (latitude: number, longitude: number) => void
  ) => {
    setLoading(true);
    try {
      const isNativePlatform = Capacitor.isNativePlatform();
      const isGeolocationPluginAvailable =
        Capacitor.isPluginAvailable('Geolocation');

      // Sets coordinates for Android devices
      if (isGeolocationPluginAvailable && isNativePlatform) {
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
        onSuccess(position.coords.latitude, position.coords.longitude);
        return;
      }

      // Sets coordinates for browsers
      if ('geolocation' in navigator && !isNativePlatform) {
        navigator.geolocation.getCurrentPosition(
          (position: GeolocationPosition) =>
            onSuccess(position.coords.latitude, position.coords.longitude),
          (error: GeolocationPositionError) => handleGeolocationWebError(error),
          { enableHighAccuracy: true }
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
    // If latitude and longitude are provided, calculate the user's distance from them
    if (latitude !== undefined && longitude !== undefined)
      fetchCoordinates((lat, long) => calculateDistance(lat, long));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latitude, longitude]);

  const formatCoordinate = (
    coordinate: number,
    isLatitude?: boolean
  ): string => {
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
  const formattedLatitude = formatCoordinate(latitude ?? 0, isLatitude);
  const formattedLongitude = formatCoordinate(longitude ?? 0, !isLatitude);

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
            onClick={() => {
              fetchCoordinates((lat, long) => updateCoordinates(lat, long));
            }}
            Icon={<LocationIcon />}
            label={t('label.update-live-location')}
          />
        </Stack>
      )}
      <InputWithLabelRow
        label={t('label.distance')}
        labelProps={{
          sx: {
            width: 180,
          },
        }}
        Input={<ReadOnlyInput value={`${distance ?? 0}`} />}
      />
    </>
  );
};
