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

export const getEquipmentStatusTranslation = (
  t: TypedTFunction<LocaleKey>,
  status: AssetLogStatusNodeType
): string => {
  const translationKey = statusTranslation[status];
  return t(translationKey);
};

export const statusColorMap = (
  t: TypedTFunction<LocaleKey>,
  status: AssetLogStatusNodeType
): { color: string; label: string } | undefined => {
  const map: Record<AssetLogStatusNodeType, { color: string; label: string }> =
    {
      [AssetLogStatusNodeType.Decommissioned]: {
        color: 'cceStatus.decommissioned',
        label: t('status.decommissioned'),
      },
      [AssetLogStatusNodeType.Functioning]: {
        color: 'cceStatus.functioning',
        label: t('status.functioning'),
      },
      [AssetLogStatusNodeType.FunctioningButNeedsAttention]: {
        color: 'cceStatus.functioningButNeedsAttention',
        label: t('status.functioning-but-needs-attention'),
      },
      [AssetLogStatusNodeType.NotFunctioning]: {
        color: 'cceStatus.notFunctioning',
        label: t('status.not-functioning'),
      },
      [AssetLogStatusNodeType.NotInUse]: {
        color: 'cceStatus.notInUse',
        label: t('status.not-in-use'),
      },
      [AssetLogStatusNodeType.Unserviceable]: {
        color: 'cceStatus.unserviceable',
        label: t('status.unserviceable'),
      },
    };
  return map[status];
};

export const fullStatusColorMap = (
  t: TypedTFunction<LocaleKey>
): Record<AssetLogStatusNodeType, { color: string; label: string }> => {
  return {
    [AssetLogStatusNodeType.Decommissioned]: {
      color: 'cceStatus.decommissioned',
      label: t('status.decommissioned'),
    },
    [AssetLogStatusNodeType.Functioning]: {
      color: 'cceStatus.functioning',
      label: t('status.functioning'),
    },
    [AssetLogStatusNodeType.FunctioningButNeedsAttention]: {
      color: 'cceStatus.functioningButNeedsAttention',
      label: t('status.functioning-but-needs-attention'),
    },
    [AssetLogStatusNodeType.NotFunctioning]: {
      color: 'cceStatus.notFunctioning',
      label: t('status.not-functioning'),
    },
    [AssetLogStatusNodeType.NotInUse]: {
      color: 'cceStatus.notInUse',
      label: t('status.not-in-use'),
    },
    [AssetLogStatusNodeType.Unserviceable]: {
      color: 'cceStatus.unserviceable',
      label: t('status.unserviceable'),
    },
  };
};

function baseAssetFields(t: TypedTFunction<LocaleKey>) {
  return [
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
}

export const assetsToCsv = (
  items: AssetRowFragment[],
  t: TypedTFunction<LocaleKey>,
  properties: string[],
  isCentralServer: boolean
) => {
  const dedupedAssetProperties = ArrayUtils.dedupe(properties);

  const fields: string[] = ['id'];

  if (isCentralServer) {
    fields.push(t('label.store'));
  }

  fields.push(
    ...baseAssetFields(t),
    t('label.created-datetime-UTC'),
    t('label.modified-datetime-UTC'),
    ...dedupedAssetProperties
  );

  const data = items.map(node => {
    const parsedProperties = ObjUtils.parse(node.properties);
    const parsedCatalogProperties = ObjUtils.parse(node.catalogProperties);

    const status =
      node.statusLog?.status && parseLogStatus(node.statusLog.status);

    return [
      node.id,
      ...(isCentralServer ? [node.store?.code] : []),
      node.assetNumber,
      node.catalogueItem?.code ?? '',
      Formatter.csvDateString(node.installationDate),
      Formatter.csvDateString(node.replacementDate),
      Formatter.csvDateString(node.warrantyStart),
      Formatter.csvDateString(node.warrantyEnd),
      node.serialNumber,
      status ? t(status.key) : '',
      node.needsReplacement ? node.needsReplacement : false,
      node.notes,
      Formatter.csvDateTimeString(node.createdDatetime),
      Formatter.csvDateTimeString(node.modifiedDatetime),
      ...dedupedAssetProperties.map(
        key => parsedCatalogProperties[key] ?? parsedProperties[key] ?? ''
      ),
    ];
  });

  return Formatter.csv({ fields, data });
};

export const parseLogStatus = (
  status: AssetLogStatusNodeType
): { key: LocaleKey; colour: string } | undefined => {
  switch (status) {
    case AssetLogStatusNodeType.Decommissioned:
      return {
        key: 'status.decommissioned',
        colour: 'cceStatus.decommissioned',
      };
    case AssetLogStatusNodeType.Functioning:
      return {
        key: 'status.functioning',
        colour: 'cceStatus.functioning',
      };
    case AssetLogStatusNodeType.FunctioningButNeedsAttention:
      return {
        key: 'status.functioning-but-needs-attention',
        colour: 'cceStatus.functioningButNeedsAttention',
      };
    case AssetLogStatusNodeType.NotFunctioning:
      return {
        key: 'status.not-functioning',
        colour: 'cceStatus.notFunctioning',
      };
    case AssetLogStatusNodeType.NotInUse:
      return {
        key: 'status.not-in-use',
        colour: 'cceStatus.notInUse',
      };
    case AssetLogStatusNodeType.Unserviceable:
      return {
        key: 'status.unserviceable',
        colour: 'cceStatus.unserviceable',
      };
    default:
      console.warn(`Unknown equipment status: ${status}`);
  }
};

export const importEquipmentToCsvWithErrors = (
  assets: Partial<ImportRow & LineNumber>[],
  t: TypedTFunction<LocaleKey>,
  isCentralServer: boolean,
  properties?: string[]
) => {
  const dedupedAssetProperties = ArrayUtils.dedupe(properties ?? []);

  const fields: string[] = isCentralServer ? [t('label.store')] : [];

  fields.push(
    ...baseAssetFields(t),
    t('label.line-number'),
    ...dedupedAssetProperties,
    t('label.error-message')
  );

  const data = assets.map(node => {
    const mapped: (string | number | null | undefined)[] = [
      ...(isCentralServer ? [node.store?.code] : []),
      node.assetNumber,
      node.catalogueItemCode,
      node.installationDate,
      node.replacementDate,
      node.warrantyStart,
      node.warrantyEnd,
      node.serialNumber,
      node.status,
      node.needsReplacement ? 'X' : '',
      node.notes,
      node.lineNumber,
      ...dedupedAssetProperties.map(key => node.properties?.[key] ?? ''),
      node.errorMessage,
    ];

    return mapped;
  });
  return Formatter.csv({ fields, data });
};

export const importEquipmentToCsv = (
  assets: Partial<ImportRow>[],
  t: TypedTFunction<LocaleKey>,
  isCentralServer: boolean = false,
  properties?: string[]
) => {
  const dedupedAssetProperties = ArrayUtils.dedupe(properties ?? []);

  const fields: string[] = isCentralServer ? [t('label.store')] : [];

  fields.push(...baseAssetFields(t), ...dedupedAssetProperties);

  const data = assets.map(node => {
    const statusKey = parseLogStatus(
      node.status ?? AssetLogStatusNodeType.Functioning // to avoid status being undefined
    )?.key;
    const row = [
      ...(isCentralServer ? [node.store?.code] : []),
      node.assetNumber,
      node.catalogueItemCode,
      node.installationDate,
      node.replacementDate,
      node.warrantyStart,
      node.warrantyEnd,
      node.serialNumber,
      statusKey ? t(statusKey) : '',
      node.needsReplacement,
      node.notes,
    ];

    return row.concat(
      dedupedAssetProperties.map(key => node.properties?.[key] ?? '')
    );
  });

  return Formatter.csv({ fields, data });
};

export const parseStatusFromString = (
  status: string,
  t: TypedTFunction<LocaleKey>
): AssetLogStatusNodeType | undefined => {
  switch (status.toLowerCase()) {
    case t('status.decommissioned').toLowerCase():
      return AssetLogStatusNodeType.Decommissioned;

    case t('status.functioning').toLowerCase():
      return AssetLogStatusNodeType.Functioning;

    case t('status.functioning-but-needs-attention').toLowerCase():
      return AssetLogStatusNodeType.FunctioningButNeedsAttention;

    case t('status.not-functioning').toLowerCase():
      return AssetLogStatusNodeType.NotFunctioning;

    case t('status.not-in-use').toLowerCase():
      return AssetLogStatusNodeType.NotInUse;

    case t('status.unserviceable').toLowerCase():
      return AssetLogStatusNodeType.Unserviceable;
  }
};

export const base64ToBlob = (base64: string, contentType: string) => {
  const byteCharacters = atob(base64);
  const byteArrays = [];

  for (let offset = 0; offset < byteCharacters.length; offset += 512) {
    const slice = byteCharacters.slice(offset, offset + 512);
    const byteNumbers = new Array(slice.length);

    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }

    const byteArray = new Uint8Array(byteNumbers);
    byteArrays.push(byteArray);
  }

  return new Blob(byteArrays, { type: contentType });
};
