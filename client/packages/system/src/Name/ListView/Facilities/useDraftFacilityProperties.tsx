import { ObjUtils } from '@common/utils';
import { Dispatch, SetStateAction, useState, useEffect } from 'react';

export type DraftProperties = Record<string, string | number | boolean | null>;

interface DraftFacilityProperties {
  draftProperties: DraftProperties;
  setDraftProperties: Dispatch<SetStateAction<DraftProperties>>;
}
export const useDraftFacilityProperties = (
  initialProperties?: string | null
): DraftFacilityProperties => {
  const [draftProperties, setDraftProperties] = useState<DraftProperties>(
    ObjUtils.parse(initialProperties)
  );

  useEffect(() => {
    const parsedProperties = ObjUtils.parse(initialProperties);

    setDraftProperties(parsedProperties);
  }, [initialProperties]);

  return {
    draftProperties,
    setDraftProperties,
  };
};
