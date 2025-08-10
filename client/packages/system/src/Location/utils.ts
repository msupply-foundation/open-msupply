type LineWithLocationType = {
  locationType?: { id: string | null } | null;
};

export const checkInvalidLocationLines = <
  T extends { location?: LineWithLocationType | null },
>(
  restrictedLocationTypeId: string | null,
  currentLocationLines: T[]
): boolean => {
  return currentLocationLines.some(l => {
    if (!restrictedLocationTypeId) return false;
    const lineLocationTypeId = l.location?.locationType?.id;
    if (!lineLocationTypeId) return false;
    return restrictedLocationTypeId !== lineLocationTypeId;
  });
};
