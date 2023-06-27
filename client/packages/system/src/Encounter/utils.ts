import { useMemo } from 'react';
import {
  DateUtils,
  LocaleKey,
  TypedTFunction,
  useTranslation,
} from '@common/intl';
import { EncounterNodeStatus } from '@common/types';
import { EncounterRowFragment } from '@openmsupply-client/programs';
import { noOtherVariants } from '@openmsupply-client/common';

export const encounterStatusTranslation = (
  status: EncounterNodeStatus,
  t: TypedTFunction<LocaleKey>
): string => {
  switch (status) {
    case EncounterNodeStatus.Pending:
      return t('label.encounter-status-pending');
    case EncounterNodeStatus.Cancelled:
      return t('label.encounter-status-cancelled');
    case EncounterNodeStatus.Visited:
      return t('label.encounter-status-visited');
    default:
      return noOtherVariants(status);
  }
};

export type EncounterFragmentWithStatus = {
  effectiveStatus: string;
} & EncounterRowFragment;

export const useEncounterFragmentWithStatus = (
  nodes?: EncounterRowFragment[]
): EncounterFragmentWithStatus[] | undefined => {
  const t = useTranslation();
  return useMemo(
    () =>
      nodes?.map(node => ({
        effectiveStatus: node.status
          ? encounterStatusTranslation(node.status, t)
          : '',
        ...node,
      })),
    [nodes]
  );
};

export const useLogicalStatus = (
  startDate: Date,
  t: ReturnType<typeof useTranslation>
): string | undefined => {
  if (DateUtils.isToday(startDate)) {
    return undefined;
  } else if (DateUtils.isPast(startDate)) {
    return `${t('label.appointment')} ${t('label.encounter-status-missed')}`;
  } else if (DateUtils.isFuture(startDate)) {
    return `${t('label.appointment')} ${t('label.encounter-status-scheduled')}`;
  }
};
