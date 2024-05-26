import { PropertyNodeValueType } from '@common/types';
import { AssetFragment } from './api';

export interface LocationIds {
  locationIds: string[];
}

export interface Properties {
  parsedProperties: Record<string, string | number | boolean | null>;
}

export type DraftAsset = AssetFragment &
  LocationIds &
  Properties & { files?: File[] };

export type PropertyValue = {
  valueString?: string | null;
  valueFloat?: number | null;
  valueBool?: boolean | null;
  valueInt?: number | null;
  valueType: PropertyNodeValueType;
};
