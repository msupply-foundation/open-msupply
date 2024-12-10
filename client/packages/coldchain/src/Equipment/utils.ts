import { LocaleKey, TypedTFunction } from '@common/intl';
import { AssetRowFragment } from './api';
import { ArrayUtils, Formatter, ObjUtils } from '@common/utils';
import { StatusType } from '@common/types';
import { ImportRow, LineNumber } from './ImportAsset';

// the reference data is loaded in migrations so the id here is hardcoded
export const CCE_CLASS_ID = 'fad280b6-8384-41af-84cf-c7b6b4526ef0';

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
      node.needsReplacement,
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
  status: StatusType
): { key: LocaleKey; colour: string } | undefined => {
  switch (status) {
    case StatusType.Decommissioned:
      return {
        key: 'status.decommissioned',
        colour: 'cceStatus.decommissioned',
      };
    case StatusType.Functioning:
      return {
        key: 'status.functioning',
        colour: 'cceStatus.functioning',
      };
    case StatusType.FunctioningButNeedsAttention:
      return {
        key: 'status.functioning-but-needs-attention',
        colour: 'cceStatus.functioningButNeedsAttention',
      };
    case StatusType.NotFunctioning:
      return {
        key: 'status.not-functioning',
        colour: 'cceStatus.notFunctioning',
      };
    case StatusType.NotInUse:
      return {
        key: 'status.not-in-use',
        colour: 'cceStatus.notInUse',
      };
    case StatusType.Unserviceable:
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
    const parsedStatus = parseLogStatus(node.status??StatusType.Functioning)?.key // to avoid status being undefined
    const row = [
      ...(isCentralServer ? [node.store?.code] : []),
      node.assetNumber,
      node.catalogueItemCode,
      node.installationDate,
      node.replacementDate,
      node.warrantyStart,
      node.warrantyEnd,
      node.serialNumber,
      node.status && parsedStatus ? t(parsedStatus) : '',
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
): StatusType | undefined => {
  switch (status.toLowerCase()) {
    case t('status.decommissioned').toLowerCase():
      return StatusType.Decommissioned;

    case t('status.functioning').toLowerCase():
      return StatusType.Functioning;

    case t('status.functioning-but-needs-attention').toLowerCase():
      return StatusType.FunctioningButNeedsAttention;

    case t('status.not-functioning').toLowerCase():
      return StatusType.NotFunctioning;

    case t('status.not-in-use').toLowerCase():
      return StatusType.NotInUse;

    case t('status.unserviceable').toLowerCase():
      return StatusType.Unserviceable;
  }
};
