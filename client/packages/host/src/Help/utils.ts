export const formatCoordinate = (
  coordinate: number,
  isLatitude: boolean
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
  const seconds = Math.floor((absolute - degrees - minutes / 60) * 3600);
  return `${direction} ${degrees}° ${minutes}' ${seconds}"`;
};
