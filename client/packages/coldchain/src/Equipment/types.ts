import { AssetFragment } from './api';

export interface LocationIds {
  locationIds: string[];
}

export interface Properties {
  parsedProperties: Record<string, string | number | boolean | null>;
  parsedCatalogProperties: Record<string, string | number | boolean | null>;
}

export type DraftAsset = AssetFragment &
  LocationIds &
  Properties & { files?: File[] };
