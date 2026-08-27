/**
 * Hook to fetch and return previous encounter data to be used by JSON Forms
 * components.
 *
 * Ensures that only one call to the API is made for each JSON Form instance,
 * and components can access their own paths with that fetched Encounter object
 * without additional API calls.
 *
 * The output of this hook is passed to the global JSON Forms "config" object,
 * for forms that require it. Currently this is used by the Encounter Detail
 * View component.
 */

import { useCallback, useRef } from 'react';
import { EncounterFragment, useEncounter } from '../api';
import { PreviousDocument } from './common';
import { extractProperty } from '@common/utils';
import { EncounterNodeStatus } from '@common/types';

export const usePreviousEncounter = (
  patientId?: string,
  encounterDate?: string
): PreviousDocument => {
  const { data, refetch } = useEncounter.document.previous(
    patientId,
    encounterDate ? new Date(encounterDate) : new Date(),
    // Don't fetch data on initial mount, only when called by `getPrevious`,
    // which ensures that if no components request previous encounter data, no
    // API queries are made.
    false
  );

  // Store the encounter data in a ref to prevent subsequent fetches.
  const previousEncounter = useRef(data?.document.data); // Will probably be undefined on initial mount

  const getPrevious = useCallback(
    async (path: string): Promise<PreviousData | undefined> => {
      if (previousEncounter.current) {
        // Retrieve data from ref store if it exists already
        // console.log('Returning cached previous encounter data for path:', path);
        return getEncounterData(previousEncounter.current, path);
      }

      // Otherwise fetch from API and store in ref
      const result = await refetch();
      // console.log('Refetched encounter:', result.data?.document.data);
      const fetchedEncounter = result.data;
      previousEncounter.current = fetchedEncounter?.document.data;

      return fetchedEncounter
        ? getEncounterData(fetchedEncounter.document.data, path)
        : undefined;
    },
    []
  );

  if (!patientId) return {};

  return { getPrevious };
};

export interface PreviousData {
  startDatetime: string;
  endDatetime?: string | null;
  status: EncounterNodeStatus;
  previousValue?: unknown;
}

const getEncounterData = (
  encounter: EncounterFragment,
  path: string
): PreviousData | undefined => {
  const previousValue = extractProperty(encounter, path, undefined);

  if (previousValue === undefined) return undefined;
  return {
    startDatetime: encounter.startDatetime,
    endDatetime: encounter.endDatetime,
    status: encounter.status ?? EncounterNodeStatus.Visited,
    previousValue,
  };
};
