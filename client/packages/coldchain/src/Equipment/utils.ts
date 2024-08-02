import { LocaleKey, TypedTFunction } from '@common/intl';
import { AssetRowFragment } from './api';
import { Formatter, ObjUtils } from '@common/utils';
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
    t('label.serial'),
    t('label.asset-notes'),
  ];
}

export const assetsToCsv = (
  items: AssetRowFragment[],
  t: TypedTFunction<LocaleKey>,
  properties: string[]
) => {
  const fields: string[] = ['id'].concat(baseAssetFields(t));

  fields.push(t('label.created-datetime'), t('label.modified-datetime'));

  fields.push(...properties);

  const data = items.map(node => {
    const parsedProperties = ObjUtils.parse(node.properties);
    const parsedCatalogProperties = ObjUtils.parse(node.catalogProperties);

    return [
      node.id,
      node.assetNumber,
      node.catalogueItem?.code ?? '',
      Formatter.csvDateString(node.installationDate),
      Formatter.csvDateString(node.replacementDate),
      node.serialNumber,
      node.notes,
      Formatter.csvDateTimeString(node.createdDatetime),
      Formatter.csvDateTimeString(node.modifiedDatetime),
      ...properties.map(
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
  const props = properties ?? [];

  const fields: string[] = [
    t('label.asset-number'),
    t('label.catalogue-item-code'),
  ];

  if (isCentralServer) {
    fields.push(t('label.store'));
  }

  fields.push(
    t('label.asset-notes'),
    t('label.serial'),
    t('label.installation-date'),
    t('label.replacement-date'),
    t('label.line-number'),
    ...props,
    t('label.error-message')
  );

  const data = assets.map(node => {
    const mapped: (string | number | null | undefined)[] = [
      node.assetNumber,
      node.catalogueItemCode,
    ];
    if (isCentralServer) mapped.push(node.store?.code);
    mapped.push(
      node.notes,
      node.serialNumber,
      node.installationDate,
      node.replacementDate,
      node.lineNumber,
      ...props.map(key => node.properties?.[key] ?? ''),
      node.errorMessage
    );

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
  const fields = baseAssetFields(t);
  if (isCentralServer) {
    fields.push(t('label.store'));
  }

  const props = properties ?? [];
  fields.push(...props);

  const data = assets.map(node => {
    const row = [
      node.assetNumber,
      node.catalogueItemCode,
      node.installationDate,
      node.replacementDate,
      node.serialNumber,
      node.notes,
    ];

    if (isCentralServer) row.push(node.store?.code);

    return row.concat(props.map(key => node.properties?.[key] ?? ''));
  });

  return Formatter.csv({ fields, data });
};
