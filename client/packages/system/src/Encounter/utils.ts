import { useMemo } from 'react';
import {
  DateUtils,
  LocaleKey,
  TypedTFunction,
  useTranslation,
} from '@common/intl';
import { EncounterNodeStatus } from '@common/types';
import { EncounterRowFragment } from '@openmsupply-client/programs';

const effectiveStatus = (
  encounter: EncounterRowFragment,
  t: TypedTFunction<LocaleKey>
) => {
  const status = encounter.status;
  if (!status) {
    return '';
  }
  switch (status) {
    case EncounterNodeStatus.Cancelled:
      return t('label.encounter-status-cancelled');
    case EncounterNodeStatus.Done:
      return t('label.encounter-status-done');
    case EncounterNodeStatus.Scheduled:
      if (DateUtils.isBefore(new Date(encounter.startDatetime), Date.now())) {
        return t('label.encounter-status-missed');
      }
      return t('label.encounter-status-scheduled');
    default:
      ((_: never) => {
        // exhaustive check
        _;
      })(status);
  }
  return '';
};

export type EncounterFragmentWithStatus = {
  effectiveStatus: string;
} & EncounterRowFragment;

export const useEncounterFragmentWithStatus = (
  nodes?: EncounterRowFragment[]
): EncounterFragmentWithStatus[] | undefined => {
  const t = useTranslation('common');
  return useMemo(
    () =>
      nodes?.map(node => ({
        effectiveStatus: effectiveStatus(node, t),
        ...node,
      })),
    [nodes]
  );
};
