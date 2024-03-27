import { LocaleKey, TypedTFunction } from '@common/intl';
import { AssetFragment } from './api';
import { Formatter } from '@common/utils';
import { AssetLogStatusInput, ReasonType, StatusType } from '@common/types';
import { ImportRow, LineNumber } from './ImportAsset';
import { LocationIds } from './DetailView';

// the reference data is loaded in migrations so the id here is hardcoded
export const CCE_CLASS_ID = 'fad280b6-8384-41af-84cf-c7b6b4526ef0';

export const assetsToCsv = (
  items: AssetFragment[],
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
    case StatusType.Decomissioned:
      return {
        key: 'status.decomissioned',
        colour: 'cceStatus.decomissioned',
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

export const parseLogReason = (
  reason: ReasonType
): { key: LocaleKey } | undefined => {
  switch (reason) {
    case ReasonType.AwaitingDecomissioning:
      return { key: 'reason.awaiting-decomissioning' };
    case ReasonType.AwaitingInstallation:
      return { key: 'reason.awaiting-installation' };
    case ReasonType.Decomissioned:
      return { key: 'reason.decomissioned' };
    case ReasonType.Functioning:
      return { key: 'reason.functioning' };
    case ReasonType.LackOfPower:
      return { key: 'reason.lack-of-power' };
    case ReasonType.MultipleTemperatureBreaches:
      return { key: 'reason.multi-temperature-breaches' };
    case ReasonType.NeedsServicing:
      return { key: 'reason.needs-servicing' };
    case ReasonType.NeedsSpareParts:
      return { key: 'reason.needs-spare-parts' };
    case ReasonType.OffsiteForRepairs:
      return { key: 'reason.offsite-for-repairs' };
    case ReasonType.Stored:
      return { key: 'reason.stored' };
    case ReasonType.Unknown:
      return { key: 'reason.unknown' };
    default:
      console.warn(`Unknown equipment reason: ${reason}`);
  }
};

// used to prevent an error from the API when inserting
// without the restriction here then the user has to guess which combinations are valid
// If new entries are added to the API, this will need updating
export const reasonsByStatus = {
  [AssetLogStatusInput.NotInUse]: [
    ReasonType.AwaitingInstallation,
    ReasonType.Stored,
    ReasonType.OffsiteForRepairs,
    ReasonType.AwaitingDecomissioning,
  ],
  [AssetLogStatusInput.Functioning]: [],
  [AssetLogStatusInput.FunctioningButNeedsAttention]: [
    ReasonType.NeedsServicing,
    ReasonType.MultipleTemperatureBreaches,
  ],
  [AssetLogStatusInput.NotFunctioning]: [
    ReasonType.NeedsSpareParts,
    ReasonType.LackOfPower,
    ReasonType.Unknown,
  ],
  [AssetLogStatusInput.Decomissioned]: [],
};

export const translateReason = (
  reason: ReasonType | null | undefined,
  t: TypedTFunction<LocaleKey>
) => {
  const defaultValue = '-';
  if (reason === null || reason === undefined) return defaultValue;

  const parsed = parseLogReason(reason);

  return parsed === undefined ? defaultValue : t(parsed.key);
};

export const importEquipmentToCsvWithErrors = (
  assets: Partial<ImportRow & LineNumber>[],
  t: TypedTFunction<LocaleKey>
) => {
  const fields: string[] = [
    'id',
    t('label.asset-number'),
    t('label.catalogue-item-code'),
    t('label.asset-notes'),
    t('label.line-number'),
    t('label.error-message'),
  ];

  const data = assets.map(node => [
    node.id,
    node.assetNumber,
    node.catalogueItemCode,
    node.notes,
    node.lineNumber,
    node.errorMessage,
  ]);

  return Formatter.csv({ fields, data });
};

export const importEquipmentToCsv = (
  assets: Partial<ImportRow & LocationIds>[],
  t: TypedTFunction<LocaleKey>
) => {
  const fields: string[] = [
    'id',
    t('label.asset-number'),
    t('label.catalogue-item-code'),
    t('label.asset-notes'),
  ];

  const data = assets.map(node => [
    node.id,
    node.assetNumber,
    node.catalogueItemCode,
    node.notes,
  ]);

  return Formatter.csv({ fields, data });
};
