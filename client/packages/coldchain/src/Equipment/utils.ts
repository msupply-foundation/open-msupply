import { AssetRowFragment } from './api';
import {
  LocaleKey,
  TypedTFunction,
  ArrayUtils,
  Formatter,
  ObjUtils,
  AssetLogStatusNodeType,
} from '@openmsupply-client/common';
import { ImportRow, LineNumber } from './ImportAsset';

// the reference data is loaded in migrations so the id here is hardcoded
export const CCE_CLASS_ID = 'fad280b6-8384-41af-84cf-c7b6b4526ef0';

const statusTranslation: Record<AssetLogStatusNodeType, LocaleKey> = {
  [AssetLogStatusNodeType.Decommissioned]: 'status.decommissioned',
  [AssetLogStatusNodeType.Functioning]: 'status.functioning',
  [AssetLogStatusNodeType.FunctioningButNeedsAttention]:
    'status.functioning-but-needs-attention',
  [AssetLogStatusNodeType.NotFunctioning]: 'status.not-functioning',
  [AssetLogStatusNodeType.NotInUse]: 'status.not-in-use',
  [AssetLogStatusNodeType.Unserviceable]: 'status.unserviceable',
};

const statusColorMapping: Record<AssetLogStatusNodeType, string> = {
  [AssetLogStatusNodeType.Decommissioned]: 'cceStatus.decommissioned',
  [AssetLogStatusNodeType.Functioning]: 'cceStatus.functioning',
  [AssetLogStatusNodeType.FunctioningButNeedsAttention]:
    'cceStatus.functioningButNeedsAttention',
  [AssetLogStatusNodeType.NotFunctioning]: 'cceStatus.notFunctioning',
  [AssetLogStatusNodeType.NotInUse]: 'cceStatus.notInUse',
  [AssetLogStatusNodeType.Unserviceable]: 'cceStatus.unserviceable',
};

export const getEquipmentStatusTranslation = (
  t: TypedTFunction<LocaleKey>,
  status: AssetLogStatusNodeType
): string => {
  const translationKey = statusTranslation[status];
  return t(translationKey);
};

export const statusColourMap = (
  status?: AssetLogStatusNodeType | null
): { label: LocaleKey; colour: string } | undefined => {
  if (!status) return undefined;

  const label = statusTranslation[status];
  const colour = statusColorMapping[status];

  return { label, colour };
};

export const fullStatusColourMap = (
  t: TypedTFunction<LocaleKey>
): Record<AssetLogStatusNodeType, { colour: string; label: string }> => {
  const entries = Object.entries(statusTranslation).map(([status, label]) => [
    status,
    {
      colour: statusColorMapping[status as AssetLogStatusNodeType],
      label: t(label),
    },
  ]);
  return Object.fromEntries(entries) as Record<
    AssetLogStatusNodeType,
    { colour: string; label: string }
  >;
};

const baseAssetFields = (t: TypedTFunction<LocaleKey>): string[] => [
  t('label.asset-number'),
  t('label.catalogue-item-code'),
  t('label.installation-date'),
  t('label.replacement-date'),
  t('label.warranty-start-date'),
  t('label.warranty-end-date'),
  t('label.serial'),
  t('label.status'),
  t('label.needs-replacement'),
  t('label.asset-notes'),
];

export const assetsToCsv = (
  items: AssetRowFragment[],
  t: TypedTFunction<LocaleKey>,
  properties: string[],
  isCentralServer: boolean
): string => {
  const dedupedAssetProperties = ArrayUtils.dedupe(properties);

  const fields: string[] = [
    'id',
    ...(isCentralServer ? [t('label.store')] : []),
    ...baseAssetFields(t),
    t('label.created-datetime-UTC'),
    t('label.modified-datetime-UTC'),
    ...dedupedAssetProperties,
  ];

  const data = items.map(node => {
    const parsedProperties = ObjUtils.parse(node.properties);
    const parsedCatalogProperties = ObjUtils.parse(node.catalogProperties);
    const statusInfo = statusColourMap(node.statusLog?.status);

    return [
      node.id,
      ...(isCentralServer ? [node.store?.code ?? ''] : []),
      node.assetNumber ?? '',
      node.catalogueItem?.code ?? '',
      Formatter.csvDateString(node.installationDate),
      Formatter.csvDateString(node.replacementDate),
      Formatter.csvDateString(node.warrantyStart),
      Formatter.csvDateString(node.warrantyEnd),
      node.serialNumber ?? '',
      statusInfo ? t(statusInfo.label) : '',
      node.needsReplacement ?? false,
      node.notes ?? '',
      Formatter.csvDateTimeString(node.createdDatetime),
      Formatter.csvDateTimeString(node.modifiedDatetime),
      ...dedupedAssetProperties.map(
        key => parsedCatalogProperties[key] ?? parsedProperties[key] ?? ''
      ),
    ];
  });

  return Formatter.csv({ fields, data });
};

export const importEquipmentToCsvWithErrors = (
  assets: Partial<ImportRow & LineNumber>[],
  t: TypedTFunction<LocaleKey>,
  isCentralServer: boolean,
  properties?: string[]
): string => {
  const dedupedAssetProperties = ArrayUtils.dedupe(properties ?? []);

  const fields: string[] = [
    ...(isCentralServer ? [t('label.store')] : []),
    ...baseAssetFields(t),
    t('label.line-number'),
    ...dedupedAssetProperties,
    t('label.error-message'),
  ];

  const data = assets.map(node => [
    ...(isCentralServer ? [node.store?.code ?? ''] : []),
    node.assetNumber ?? '',
    node.catalogueItemCode ?? '',
    node.installationDate ?? '',
    node.replacementDate ?? '',
    node.warrantyStart ?? '',
    node.warrantyEnd ?? '',
    node.serialNumber ?? '',
    node.status ?? '',
    node.needsReplacement ? 'X' : '',
    node.notes ?? '',
    node.lineNumber ?? '',
    ...dedupedAssetProperties.map(key => node.properties?.[key] ?? ''),
    node.errorMessage ?? '',
  ]);
  return Formatter.csv({ fields, data });
};

export const importEquipmentToCsv = (
  assets: Partial<ImportRow>[],
  t: TypedTFunction<LocaleKey>,
  isCentralServer = false,
  properties?: string[]
): string => {
  const dedupedAssetProperties = ArrayUtils.dedupe(properties ?? []);

  const fields: string[] = [
    ...(isCentralServer ? [t('label.store')] : []),
    ...baseAssetFields(t),
    ...dedupedAssetProperties,
  ];

  const data = assets.map(node => {
    const statusInfo = statusColourMap(
      node.status ?? AssetLogStatusNodeType.Functioning
    );

    return [
      ...(isCentralServer ? [node.store?.code ?? ''] : []),
      node.assetNumber ?? '',
      node.catalogueItemCode ?? '',
      node.installationDate ?? '',
      node.replacementDate ?? '',
      node.warrantyStart ?? '',
      node.warrantyEnd ?? '',
      node.serialNumber ?? '',
      statusInfo ? t(statusInfo.label) : '',
      node.needsReplacement ?? '',
      node.notes ?? '',
      ...dedupedAssetProperties.map(key => node.properties?.[key] ?? ''),
    ];
  });

  return Formatter.csv({ fields, data });
};

export const parseStatusFromString = (
  status: string,
  t: TypedTFunction<LocaleKey>
): AssetLogStatusNodeType | undefined => {
  if (!status) return undefined;

  const normalizedStatus = status.toLowerCase().trim();

  const statusMap: Record<string, AssetLogStatusNodeType> = {
    [t('status.decommissioned').toLowerCase()]:
      AssetLogStatusNodeType.Decommissioned,
    [t('status.functioning').toLowerCase()]: AssetLogStatusNodeType.Functioning,
    [t('status.functioning-but-needs-attention').toLowerCase()]:
      AssetLogStatusNodeType.FunctioningButNeedsAttention,
    [t('status.not-functioning').toLowerCase()]:
      AssetLogStatusNodeType.NotFunctioning,
    [t('status.not-in-use').toLowerCase()]: AssetLogStatusNodeType.NotInUse,
    [t('status.unserviceable').toLowerCase()]:
      AssetLogStatusNodeType.Unserviceable,
  };

  return statusMap[normalizedStatus];
};

export const base64ToBlob = (base64: string, contentType: string): Blob => {
  const byteCharacters = atob(base64);
  const byteNumbers = new Uint8Array(byteCharacters.length);

  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }

  return new Blob([byteNumbers], { type: contentType });
};
