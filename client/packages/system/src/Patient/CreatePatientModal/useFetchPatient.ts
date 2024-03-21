import {
  noOtherVariants,
  useMutation,
  useQueryClient,
  useTranslation,
} from '@openmsupply-client/common';
import { mapSyncError, useSync } from '../../Sync';
import { useCallback, useState } from 'react';
import { usePatientApi } from '../api/hooks/utils/usePatientApi';

export type Step = 'Start' | 'Linking' | 'Syncing' | 'Synced';

/**
 * Links the patient to the current store and sync the patient over.
 */
export const useFetchPatient = () => {
  const api = usePatientApi();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<Step>('Start');
  const t = useTranslation('dispensary');
  const [error, setError] = useState<string | undefined>(undefined);

  const { mutateAsync: linkPatientToStore } = useMutation((nameId: string) =>
    api.linkPatientToStore(nameId)
  );
  const { mutateAsync: manualSync } = useSync.sync.manualSync();
  const { mutateAsync: getSyncStatus } = useSync.utils.mutateSyncStatus();

  const pollTillSynced = useCallback(async () => {
    while (true) {
      const result = await getSyncStatus();
      if (result?.error) {
        const error = mapSyncError(t, result.error, 'error.unknown-sync-error');
        setError(error.error);
        continue;
      }

      if (!result?.isSyncing) {
        break;
      }
    }
  }, [getSyncStatus, t]);

  const mutateAsync = useCallback(
    async (patientId: string) => {
      setStep('Linking');
      const patientStoreLink = await linkPatientToStore(patientId);
      if (patientStoreLink.__typename === 'LinkPatientPatientToStoreError') {
        switch (patientStoreLink.error.__typename) {
          case 'ConnectionError': {
            setError(t('messages.failed-to-reach-central'));
            break;
          }
          default:
            noOtherVariants(patientStoreLink.error.__typename);
        }
        return;
      }

      setStep('Syncing');
      await manualSync();
      await pollTillSynced();
      await queryClient.invalidateQueries(api.keys.list());
      setStep('Synced');
    },
    [api.keys, linkPatientToStore, manualSync, queryClient, pollTillSynced, t]
  );

  return { mutateAsync, error, step };
};
