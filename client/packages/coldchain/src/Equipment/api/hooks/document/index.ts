import { useAsset, useFetchAssetById, useFetchAssetByGS1 } from './useAsset';
import { useAssetDelete } from './useAssetDelete';
import { useAssetFields } from './useAssetFields';
import { useAssetInsert } from './useAssetInsert';
import { useAssetUpdate } from './useAssetUpdate';
import { useAssets } from './useAssets';
import { useAssetsAll } from './useAssetsAll';
import { useAssetsDelete } from './useAssetsDelete';
import { useInfiniteAssets } from './useInfiniteAssets';

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
  useFetchAssetByGS1,
  useInfiniteAssets,
};
