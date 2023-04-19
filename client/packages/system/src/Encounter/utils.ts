import { useMemo } from 'react';
import { LocaleKey, TypedTFunction, useTranslation } from '@common/intl';
import { EncounterNodeStatus } from '@common/types';
import { EncounterRowFragment } from '@openmsupply-client/programs';

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
      return ((_: never) => '')(status);
  }
};

export const effectiveStatus = (
  encounter: EncounterRowFragment,
  t: TypedTFunction<LocaleKey>
): string => {
  const status = encounter.status;
  if (!status) {
    return '';
  }
  return encounterStatusTranslation(status, t);
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
