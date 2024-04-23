import { PropertyNodeValueType } from '@common/types';
import { AssetFragment } from './api';

export interface LocationIds {
  locationIds: string[];
}

export type DraftAsset = AssetFragment & LocationIds & { files?: File[] };

export type PropertyValue = {
  valueString?: string | null;
  valueFloat?: number | null;
  valueBool?: boolean | null;
  valueInt?: number | null;
  valueType: PropertyNodeValueType;
};
