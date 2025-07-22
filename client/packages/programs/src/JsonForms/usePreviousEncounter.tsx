import { useCallback, useRef, useState } from 'react';
import { useEncounter } from '../api';
import { PreviousDocument } from './common';
import { extractProperty } from '@common/utils';

export const usePreviousEncounter = (
  patientId?: string,
  encounterDate?: string
): PreviousDocument => {
  const { data, refetch } = useEncounter.document.previous(
    patientId,
    encounterDate ? new Date(encounterDate) : new Date(),
    false
  );

  const previousEncounter = useRef(data?.document.data);

  const getPrevious = useCallback(
    async (path: string): Promise<any | undefined> => {
      console.log('Getting previous for path:', path);
      console.log('Ref value', previousEncounter.current);
      if (previousEncounter.current) {
        console.log('Returning cached previous encounter data for path:', path);
        return extractProperty(previousEncounter.current, path);
      }

      console.log('Refetching, prev is currently', previousEncounter.current);
      const result = await refetch();
      console.log('Refetched encounter:', result.data?.document.data);
      const fetchedEncounter = result.data;
      previousEncounter.current = fetchedEncounter?.document.data;

      return fetchedEncounter
        ? extractProperty(fetchedEncounter.document.data, path)
        : undefined;
    },
    []
  );

  if (!patientId) return {};

  return { getPrevious };
};
