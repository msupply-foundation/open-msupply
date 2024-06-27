import { LocaleKey, TypedTFunction } from '@common/intl';
import { AssetRowFragment } from './api';
import { ArrayUtils, Formatter } from '@common/utils';
import { StatusType } from '@common/types';
import { ImportRow, LineNumber } from './ImportAsset';

// the reference data is loaded in migrations so the id here is hardcoded
export const CCE_CLASS_ID = 'fad280b6-8384-41af-84cf-c7b6b4526ef0';

function baseAssetFields(t: TypedTFunction<LocaleKey>) {
  return [
    'id',
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
  t: TypedTFunction<LocaleKey>
) => {
  const fields: string[] = baseAssetFields(t);
  fields.push(t('label.created-datetime'), t('label.modified-datetime'));

  const data = items.map(node => [
    node.id,
    node.assetNumber,
    node.catalogueItem?.code ?? '',
    Formatter.csvDateString(node.installationDate),
    Formatter.csvDateString(node.replacementDate),
    node.serialNumber,
    node.notes,
    Formatter.csvDateTimeString(node.createdDatetime),
    Formatter.csvDateTimeString(node.modifiedDatetime),
  ]);
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
  isCentralServer: boolean
) => {
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
    t('label.error-message')
  );

  const data = assets.map(node => {
    const mapped: (string | number | null | undefined)[] = [
      node.assetNumber,
      node.catalogueItemCode,
    ];
    if (isCentralServer) mapped.push(node.store?.code);
    mapped.push(node.notes);
    mapped.push(node.serialNumber);
    mapped.push(node.installationDate);
    mapped.push(node.replacementDate);
    mapped.push(node.lineNumber);
    mapped.push(node.errorMessage);
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
  const props =
    properties ?? ArrayUtils.dedupe(Object.keys(assets[0]?.properties ?? {}));
  const fields = baseAssetFields(t).concat(props);

  if (isCentralServer) {
    fields.push(t('label.store'));
  }

  const data = assets.map(node => {
    const row = [
      node.id,
      node.assetNumber,
      node.catalogueItemCode,
      node.installationDate,
      node.replacementDate,
      node.serialNumber,
      node.notes,
    ].concat(props.map(key => node.properties?.[key] ?? ''));
    if (isCentralServer) row.push(node.store?.code);
    return row;
  });

  return Formatter.csv({ fields, data });
};
