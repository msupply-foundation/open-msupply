import { useAsset, useFetchAssetById } from './useAsset';
import { useAssetDelete } from './useAssetDelete';
import { useAssetFields } from './useAssetFields';
import { useAssetInsert } from './useAssetInsert';
import { useAssetUpdate } from './useAssetUpdate';
import { useAssets } from './useAssets';
import { useAssetsAll } from './useAssetsAll';
import { useAssetsDelete } from './useAssetsDelete';
import { useAssetProperties } from '@openmsupply-client/system/src/Asset/api/hooks/utils/useAssetProperties';

export const Document = {
  useAsset,
  useAssetFields,
  useAssets,
  useAssetsAll,
  useAssetInsert,
  useAssetDelete,
  useAssetsDelete,
  useAssetUpdate,
  useFetchAssetById,
  useAssetProperties,
};
