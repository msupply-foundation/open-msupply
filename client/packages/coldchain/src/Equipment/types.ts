import { AssetFragment } from './api';

export interface LocationIds {
  locationIds: string[];
}

export type DraftAsset = AssetFragment & LocationIds & { files?: File[] };
