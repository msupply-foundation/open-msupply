import { LocaleKey, TypedTFunction } from '@common/intl';
import { AssetRowFragment } from './api';
import { Formatter } from '@common/utils';
import { StatusType } from '@common/types';
import { ImportRow, LineNumber } from './ImportAsset';

// the reference data is loaded in migrations so the id here is hardcoded
export const CCE_CLASS_ID = 'fad280b6-8384-41af-84cf-c7b6b4526ef0';

export const assetsToCsv = (
  items: AssetRowFragment[],
  t: TypedTFunction<LocaleKey>
) => {
  const fields: string[] = [
    'id',
    t('label.asset-number'),
    t('label.created-datetime'),
    t('label.modified-datetime'),
    t('label.installation-date'),
    t('label.replacement-date'),
    t('label.serial'),
    t('label.notes'),
  ];

  const data = items.map(node => [
    node.id,
    node.assetNumber,
    Formatter.csvDateTimeString(node.createdDatetime),
    Formatter.csvDateTimeString(node.modifiedDatetime),
    Formatter.csvDateString(node.installationDate),
    Formatter.csvDateString(node.replacementDate),
    node.serialNumber,
    node.notes,
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

export const translateReason = (
  reason: string | null | undefined,
  _t: TypedTFunction<LocaleKey>
) => {
  const defaultValue = '-';
  if (reason === null || reason === undefined) return defaultValue;

  const parsed = reason;

  return parsed === undefined ? defaultValue : parsed;
};

export const importEquipmentToCsvWithErrors = (
  assets: Partial<ImportRow & LineNumber>[],
  t: TypedTFunction<LocaleKey>
) => {
  const fields: string[] = [
    t('label.asset-number'),
    t('label.catalogue-item-code'),
    t('label.asset-notes'),
    t('label.serial'),
    t('label.installation-date'),
    t('label.line-number'),
    t('label.error-message'),
  ];

  const data = assets.map(node => [
    node.assetNumber,
    node.catalogueItemCode,
    node.notes,
    node.serialNumber,
    node.installationDate,
    node.lineNumber,
    node.errorMessage,
  ]);

  return Formatter.csv({ fields, data });
};

export const importEquipmentToCsv = (
  assets: Partial<ImportRow>[],
  t: TypedTFunction<LocaleKey>
) => {
  const fields: string[] = [
    t('label.asset-number'),
    t('label.catalogue-item-code'),
    t('label.asset-notes'),
    t('label.serial'),
    t('label.installation-date'),
  ];

  const data = assets.map(node => [
    node.assetNumber,
    node.catalogueItemCode,
    node.notes,
    node.serialNumber,
    node.installationDate,
  ]);

  return Formatter.csv({ fields, data });
};
